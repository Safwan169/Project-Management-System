import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Task } from '../models/Task';
import { Project } from '../models/Project';
import { asyncHandler } from '../utils/asyncHandler';

// Returns the current user's personal dashboard payload in one round-trip.
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.id);
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday 00:00

  const in7Days = new Date(now);
  in7Days.setDate(now.getDate() + 7);

  const myTasksFilter = { assignees: userId };

  const [
    openCount,
    overdueCount,
    projectCount,
    hoursAgg,
    grouped,
    upcoming,
    recentActivityRows,
  ] = await Promise.all([
    Task.countDocuments({ ...myTasksFilter, status: { $ne: 'done' } }),
    Task.countDocuments({
      ...myTasksFilter,
      status: { $ne: 'done' },
      dueDate: { $lt: now },
    }),
    Project.countDocuments({
      $or: [{ createdBy: userId }, { 'members.user': userId }],
    }),
    Task.aggregate<{ hours: number }>([
      { $match: myTasksFilter },
      { $unwind: '$timeLogs' },
      { $match: { 'timeLogs.user': userId, 'timeLogs.date': { $gte: startOfWeek } } },
      { $group: { _id: null, hours: { $sum: '$timeLogs.hours' } } },
    ]),
    // My tasks grouped by status, top 5 each.
    Task.aggregate([
      { $match: myTasksFilter },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: '$status',
          tasks: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 1,
          tasks: { $slice: ['$tasks', 5] },
        },
      },
    ]),
    Task.find({ ...myTasksFilter, dueDate: { $gte: now, $lte: in7Days } })
      .sort({ dueDate: 1 })
      .limit(10)
      .populate('project', 'title'),
    Task.aggregate([
      { $match: myTasksFilter },
      { $unwind: '$activityLog' },
      { $sort: { 'activityLog.timestamp': -1 } },
      { $limit: 10 },
      {
        $project: {
          taskId: '$_id',
          taskTitle: '$title',
          entry: '$activityLog',
        },
      },
    ]),
  ]);

  const byStatus: Record<string, unknown[]> = { todo: [], inprogress: [], review: [], done: [] };
  for (const g of grouped as { _id: string; tasks: unknown[] }[]) {
    byStatus[g._id] = g.tasks;
  }

  // Admin/manager-only summary of active projects with progress.
  let activeProjects: { _id: Types.ObjectId; title: string; progress: number }[] = [];
  if (req.user!.role === 'admin' || req.user!.role === 'manager') {
    const rows = await Project.aggregate<{ _id: Types.ObjectId; title: string }>([
      { $match: { status: 'active' } },
      { $project: { title: 1 } },
      { $limit: 12 },
    ]);

    const projectIds = rows.map((r) => r._id);
    const taskRows = await Task.aggregate<{ _id: Types.ObjectId; total: number; completed: number }>([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$project',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
    ]);
    const progressMap = new Map(
      taskRows.map((t) => [t._id.toString(), t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0]),
    );
    activeProjects = rows.map((r) => ({
      _id: r._id,
      title: r.title,
      progress: progressMap.get(r._id.toString()) ?? 0,
    }));
  }

  res.status(200).json({
    data: {
      stats: {
        openTasks: openCount,
        overdueTasks: overdueCount,
        hoursThisWeek: hoursAgg[0]?.hours ?? 0,
        projectCount,
      },
      myTasksByStatus: byStatus,
      upcoming,
      recentActivity: recentActivityRows,
      activeProjects,
    },
  });
});
