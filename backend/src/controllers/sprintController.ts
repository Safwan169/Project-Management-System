import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Sprint, ISprint } from '../models/Sprint';
import { Project, IProject } from '../models/Project';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { tasksBySprint, countTasksInSprint } from '../utils/projectMetrics';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

async function findProjectOr404(id: string): Promise<IProject> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid project id.', 400);
  }
  const project = await Project.findById(id);
  if (!project) {
    throw new AppError('Project not found.', 404);
  }
  return project;
}

async function findSprintOr404(sprintId: string, projectId: string): Promise<ISprint> {
  if (!Types.ObjectId.isValid(sprintId)) {
    throw new AppError('Invalid sprint id.', 400);
  }
  const sprint = await Sprint.findById(sprintId);
  // Guard against a sprint id that belongs to a different project.
  if (!sprint || sprint.project.toString() !== projectId) {
    throw new AppError('Sprint not found.', 404);
  }
  return sprint;
}

function canManageProject(project: IProject, userId: string, role: string): boolean {
  if (role === 'admin' || role === 'manager') return true;
  return project.members.some((m) => m.user.toString() === userId && m.role === 'manager');
}

export const createSprint = asyncHandler(async (req: Request, res: Response) => {
  const projectId = param(req.params.projectId);
  const project = await findProjectOr404(projectId);

  if (!canManageProject(project, req.user!.id, req.user!.role)) {
    throw new AppError('You do not have permission to add sprints to this project.', 403);
  }

  const { title, startDate, endDate, status, goal } = req.body;
  if (new Date(endDate) < new Date(startDate)) {
    throw new AppError('End date cannot be before the start date.', 400);
  }

  // sprintNumber and order are assigned by the model's pre-validate hook.
  const sprint = await Sprint.create({
    title,
    project: project._id,
    startDate,
    endDate,
    status,
    goal,
  });

  res.status(201).json({
    message: 'Sprint created successfully',
    data: { sprint },
  });
});

export const getSprints = asyncHandler(async (req: Request, res: Response) => {
  const projectId = param(req.params.projectId);
  await findProjectOr404(projectId);

  const sprints = await Sprint.find({ project: projectId }).sort({ order: 1 });

  const counts = await tasksBySprint(sprints.map((s) => s._id));
  const withCounts = sprints.map((s) => ({
    ...s.toObject(),
    taskCount: counts.get(s._id.toString())?.total ?? 0,
    completedTaskCount: counts.get(s._id.toString())?.completed ?? 0,
  }));

  res.status(200).json({ data: { sprints: withCounts } });
});

export const getSprint = asyncHandler(async (req: Request, res: Response) => {
  const projectId = param(req.params.projectId);
  const sprint = await findSprintOr404(param(req.params.sprintId), projectId);

  const counts = await tasksBySprint([sprint._id]);
  const summary = counts.get(sprint._id.toString()) ?? { total: 0, completed: 0 };

  res.status(200).json({
    data: {
      sprint,
      tasksSummary: { total: summary.total, completed: summary.completed },
    },
  });
});

export const updateSprint = asyncHandler(async (req: Request, res: Response) => {
  const projectId = param(req.params.projectId);
  const project = await findProjectOr404(projectId);
  const sprint = await findSprintOr404(param(req.params.sprintId), projectId);

  if (!canManageProject(project, req.user!.id, req.user!.role)) {
    throw new AppError('You do not have permission to update this sprint.', 403);
  }

  const start = req.body.startDate ? new Date(req.body.startDate) : sprint.startDate;
  const end = req.body.endDate ? new Date(req.body.endDate) : sprint.endDate;
  if (end < start) {
    throw new AppError('End date cannot be before the start date.', 400);
  }

  // order has its own reorder endpoint; sprintNumber and project are immutable.
  const updatable: (keyof ISprint)[] = ['title', 'startDate', 'endDate', 'status', 'goal'];
  for (const field of updatable) {
    if (req.body[field] !== undefined) {
      (sprint.set as (path: string, val: unknown) => void)(field, req.body[field]);
    }
  }
  await sprint.save();

  res.status(200).json({
    message: 'Sprint updated successfully',
    data: { sprint },
  });
});

export const deleteSprint = asyncHandler(async (req: Request, res: Response) => {
  const projectId = param(req.params.projectId);
  await findProjectOr404(projectId);
  const sprint = await findSprintOr404(param(req.params.sprintId), projectId);

  // Block deletion if tasks exist unless ?force=true.
  const force = req.query.force === 'true';
  const taskCount = await countTasksInSprint(sprint._id);
  if (taskCount > 0 && !force) {
    throw new AppError(
      `This sprint has ${taskCount} task(s). Move or delete them first, or pass force=true.`,
      409,
    );
  }

  await sprint.deleteOne();
  res.status(200).json({ message: 'Sprint deleted successfully' });
});

export const reorderSprints = asyncHandler(async (req: Request, res: Response) => {
  const projectId = param(req.params.projectId);
  const project = await findProjectOr404(projectId);

  if (!canManageProject(project, req.user!.id, req.user!.role)) {
    throw new AppError('You do not have permission to reorder sprints.', 403);
  }

  const { sprints } = req.body as { sprints?: { id: string; order: number }[] };
  if (!Array.isArray(sprints) || sprints.length === 0) {
    throw new AppError('Provide a non-empty "sprints" array of { id, order }.', 400);
  }

  // Scoped to this project so a stray id can't touch another project.
  const operations = sprints.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(id), project: project._id },
      update: { $set: { order } },
    },
  }));
  await Sprint.bulkWrite(operations);

  const updated = await Sprint.find({ project: projectId }).sort({ order: 1 });
  res.status(200).json({
    message: 'Sprints reordered successfully',
    data: { sprints: updated },
  });
});
