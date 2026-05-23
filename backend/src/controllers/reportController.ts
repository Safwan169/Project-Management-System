import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { Sprint } from '../models/Sprint';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const getSummaryReport = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [
    statusBreakdown,
    completedThisMonth,
    taskTotals,
    hoursThisMonth,
    topContributors,
  ] = await Promise.all([
    Project.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Project.countDocuments({
      status: 'completed',
      updatedAt: { $gte: monthStart },
    }),
    Task.aggregate<{ total: number; overdue: number }>([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'done'] },
                    { $ifNull: ['$dueDate', false] },
                    { $lt: ['$dueDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Task.aggregate<{ hours: number }>([
      { $unwind: '$timeLogs' },
      { $match: { 'timeLogs.date': { $gte: monthStart } } },
      { $group: { _id: null, hours: { $sum: '$timeLogs.hours' } } },
    ]),
    Task.aggregate<{
      _id: Types.ObjectId;
      hoursLogged: number;
      tasksCompleted: number;
    }>([
      {
        $facet: {
          hours: [
            { $unwind: '$timeLogs' },
            { $match: { 'timeLogs.date': { $gte: monthStart } } },
            {
              $group: {
                _id: '$timeLogs.user',
                hoursLogged: { $sum: '$timeLogs.hours' },
              },
            },
          ],
          completed: [
            { $match: { status: 'done', updatedAt: { $gte: monthStart } } },
            { $unwind: '$assignees' },
            { $group: { _id: '$assignees', tasksCompleted: { $sum: 1 } } },
          ],
        },
      },
      {
        $project: {
          combined: { $concatArrays: ['$hours', '$completed'] },
        },
      },
      { $unwind: '$combined' },
      {
        $group: {
          _id: '$combined._id',
          hoursLogged: { $sum: { $ifNull: ['$combined.hoursLogged', 0] } },
          tasksCompleted: { $sum: { $ifNull: ['$combined.tasksCompleted', 0] } },
        },
      },
      { $sort: { hoursLogged: -1, tasksCompleted: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const breakdownMap: Record<string, number> = {
    planned: 0,
    active: 0,
    completed: 0,
    archived: 0,
  };
  for (const row of statusBreakdown) {
    breakdownMap[row._id] = row.count;
  }

  const contributorIds = topContributors.map((c) => c._id);
  const userRows = await User.find({ _id: { $in: contributorIds } }).select('name avatar');
  const userMap = new Map(userRows.map((u) => [u._id.toString(), u]));

  const topContributorsHydrated = topContributors.map((c) => {
    const u = userMap.get(c._id.toString());
    return {
      userId: c._id.toString(),
      name: u?.name ?? 'Unknown',
      avatar: u?.avatar ?? null,
      hoursLogged: c.hoursLogged,
      tasksCompleted: c.tasksCompleted,
    };
  });

  res.status(200).json({
    data: {
      activeProjects: breakdownMap.active,
      completedProjectsThisMonth: completedThisMonth,
      totalTasksAcrossProjects: taskTotals[0]?.total ?? 0,
      overdueTasks: taskTotals[0]?.overdue ?? 0,
      totalHoursLoggedThisMonth: hoursThisMonth[0]?.hours ?? 0,
      topContributors: topContributorsHydrated,
      projectStatusBreakdown: breakdownMap,
    },
  });
});

export const getProjectReport = asyncHandler(async (req: Request, res: Response) => {
  const projectId = param(req.params.projectId);
  if (!Types.ObjectId.isValid(projectId)) {
    throw new AppError('Invalid project id.', 400);
  }

  const project = await Project.findById(projectId).select(
    'title status startDate endDate budget',
  );
  if (!project) {
    throw new AppError('Project not found.', 404);
  }

  const projectObjId = new Types.ObjectId(projectId);
  const now = new Date();

  const [taskStatsAgg, sprintBreakdown, memberContribAgg, timeAgg] = await Promise.all([
    Task.aggregate<{
      total: number;
      todo: number;
      inprogress: number;
      review: number;
      done: number;
      overdue: number;
    }>([
      { $match: { project: projectObjId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          inprogress: { $sum: { $cond: [{ $eq: ['$status', 'inprogress'] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'done'] },
                    { $ifNull: ['$dueDate', false] },
                    { $lt: ['$dueDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Sprint.aggregate<{
      sprintId: Types.ObjectId;
      title: string;
      sprintNumber: number;
      order: number;
      taskCount: number;
      completedCount: number;
    }>([
      { $match: { project: projectObjId } },
      {
        $lookup: {
          from: 'tasks',
          let: { sprintId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$sprint', '$$sprintId'] } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
              },
            },
          ],
          as: 'taskAgg',
        },
      },
      {
        $project: {
          _id: 0,
          sprintId: '$_id',
          title: 1,
          sprintNumber: 1,
          order: 1,
          taskCount: { $ifNull: [{ $arrayElemAt: ['$taskAgg.total', 0] }, 0] },
          completedCount: { $ifNull: [{ $arrayElemAt: ['$taskAgg.completed', 0] }, 0] },
        },
      },
      { $sort: { order: 1 } },
    ]),
    Task.aggregate<{
      _id: Types.ObjectId;
      tasksAssigned: number;
      tasksCompleted: number;
      hoursLogged: number;
    }>([
      { $match: { project: projectObjId } },
      {
        $facet: {
          assignments: [
            { $unwind: '$assignees' },
            {
              $group: {
                _id: '$assignees',
                tasksAssigned: { $sum: 1 },
                tasksCompleted: {
                  $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
                },
              },
            },
          ],
          hours: [
            { $unwind: '$timeLogs' },
            {
              $group: {
                _id: '$timeLogs.user',
                hoursLogged: { $sum: '$timeLogs.hours' },
              },
            },
          ],
        },
      },
      {
        $project: {
          combined: { $concatArrays: ['$assignments', '$hours'] },
        },
      },
      { $unwind: '$combined' },
      {
        $group: {
          _id: '$combined._id',
          tasksAssigned: { $sum: { $ifNull: ['$combined.tasksAssigned', 0] } },
          tasksCompleted: { $sum: { $ifNull: ['$combined.tasksCompleted', 0] } },
          hoursLogged: { $sum: { $ifNull: ['$combined.hoursLogged', 0] } },
        },
      },
    ]),
    Task.aggregate<{ _id: Types.ObjectId; hours: number }>([
      { $match: { project: projectObjId } },
      { $unwind: '$timeLogs' },
      {
        $group: {
          _id: '$timeLogs.user',
          hours: { $sum: '$timeLogs.hours' },
        },
      },
    ]),
  ]);

  const taskStats = taskStatsAgg[0] ?? {
    total: 0,
    todo: 0,
    inprogress: 0,
    review: 0,
    done: 0,
    overdue: 0,
  };

  const progressPercent = taskStats.total > 0
    ? Math.round((taskStats.done / taskStats.total) * 100)
    : 0;

  const userIds = Array.from(
    new Set([
      ...memberContribAgg.map((m) => m._id.toString()),
      ...timeAgg.map((t) => t._id.toString()),
    ]),
  );
  const users = await User.find({ _id: { $in: userIds } }).select('name avatar');
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const memberContributions = memberContribAgg.map((m) => {
    const u = userMap.get(m._id.toString());
    return {
      userId: m._id.toString(),
      name: u?.name ?? 'Unknown',
      avatar: u?.avatar ?? null,
      tasksAssigned: m.tasksAssigned,
      tasksCompleted: m.tasksCompleted,
      hoursLogged: m.hoursLogged,
    };
  });

  const timeLoggedByUser = timeAgg.map((t) => {
    const u = userMap.get(t._id.toString());
    return {
      userId: t._id.toString(),
      name: u?.name ?? 'Unknown',
      hours: t.hours,
    };
  });

  const timeLoggedTotal = timeLoggedByUser.reduce((sum, t) => sum + t.hours, 0);

  res.status(200).json({
    data: {
      project: {
        id: project._id.toString(),
        title: project.title,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
      },
      taskStats,
      progressPercent,
      sprintBreakdown: sprintBreakdown.map((s) => ({
        sprintId: s.sprintId.toString(),
        title: s.title,
        sprintNumber: s.sprintNumber,
        taskCount: s.taskCount,
        completedCount: s.completedCount,
        progressPercent: s.taskCount > 0
          ? Math.round((s.completedCount / s.taskCount) * 100)
          : 0,
      })),
      memberContributions,
      timeLoggedTotal,
      timeLoggedByUser,
    },
  });
});

export const getUserReport = asyncHandler(async (req: Request, res: Response) => {
  const userId = param(req.params.userId);
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id.', 400);
  }

  const user = await User.findById(userId).select('name email role avatar');
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const userObjId = new Types.ObjectId(userId);

  const [projectsCount, taskAgg, hoursAgg, priorityAgg, recentActivity] = await Promise.all([
    Project.countDocuments({
      $or: [{ createdBy: userObjId }, { 'members.user': userObjId }],
    }),
    Task.aggregate<{ assigned: number; completed: number }>([
      { $match: { assignees: userObjId } },
      {
        $group: {
          _id: null,
          assigned: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
    ]),
    Task.aggregate<{ hours: number }>([
      { $unwind: '$timeLogs' },
      { $match: { 'timeLogs.user': userObjId } },
      { $group: { _id: null, hours: { $sum: '$timeLogs.hours' } } },
    ]),
    Task.aggregate<{ _id: string; count: number }>([
      { $match: { assignees: userObjId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { assignees: userObjId } },
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

  const taskStats = taskAgg[0] ?? { assigned: 0, completed: 0 };
  const completionRate = taskStats.assigned > 0
    ? Math.round((taskStats.completed / taskStats.assigned) * 100)
    : 0;

  const tasksByPriority: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const row of priorityAgg) {
    tasksByPriority[row._id] = row.count;
  }

  res.status(200).json({
    data: {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      projectsCount,
      tasksAssigned: taskStats.assigned,
      tasksCompleted: taskStats.completed,
      completionRate,
      totalHoursLogged: hoursAgg[0]?.hours ?? 0,
      tasksByPriority,
      recentActivity,
    },
  });
});
