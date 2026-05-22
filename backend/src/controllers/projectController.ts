import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Project, IProject } from '../models/Project';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { countSprints, aggregateTasks } from '../utils/projectMetrics';

// Route params are typed string | string[]; normalise to a single string.
function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

// Loads a project by id, throwing 400/404 as appropriate.
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

// True if the user may edit the project: an admin, any manager, or a
// member assigned the 'manager' role on this specific project.
function canManageProject(project: IProject, userId: string, role: string): boolean {
  if (role === 'admin' || role === 'manager') return true;
  return project.members.some(
    (m) => m.user.toString() === userId && m.role === 'manager',
  );
}

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const { title, client, description, startDate, endDate, budget, status, members, tags } =
    req.body;

  if (new Date(endDate) < new Date(startDate)) {
    throw new AppError('End date cannot be before the start date.', 400);
  }

  const project = await Project.create({
    title,
    client,
    description,
    startDate,
    endDate,
    budget,
    status,
    tags,
    members,
    createdBy: req.user!.id,
  });

  res.status(201).json({
    message: 'Project created successfully',
    data: { project },
  });
});

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const { status, client, search } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  // Built incrementally from the query params; passed straight to find().
  const filter: Record<string, unknown> = {};

  // Members only see projects they created or belong to; admin/manager see all.
  if (req.user!.role === 'member') {
    const userId = new Types.ObjectId(req.user!.id);
    filter.$or = [{ createdBy: userId }, { 'members.user': userId }];
  }

  if (status) filter.status = status;
  if (client) filter.client = client;
  if (search) {
    // Case-insensitive match across title and client.
    const term = new RegExp(String(search).trim(), 'i');
    const searchOr = [{ title: term }, { client: term }];
    // Combine with the member scope without clobbering it.
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Project.countDocuments(filter),
  ]);

  res.status(200).json({
    data: {
      projects,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    },
  });
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const id = param(req.params.id);
  await findProjectOr404(id);

  const project = await Project.findById(id).populate('members.user', 'name email avatar');
  const projectId = new Types.ObjectId(id);

  const [sprintCount, taskCounts] = await Promise.all([
    countSprints(projectId),
    aggregateTasks(projectId),
  ]);

  res.status(200).json({
    data: {
      project,
      counts: {
        sprints: sprintCount,
        tasks: taskCounts.total,
      },
    },
  });
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await findProjectOr404(param(req.params.id));

  if (!canManageProject(project, req.user!.id, req.user!.role)) {
    throw new AppError('You do not have permission to update this project.', 403);
  }

  const { startDate, endDate } = req.body;
  const effectiveStart = startDate ? new Date(startDate) : project.startDate;
  const effectiveEnd = endDate ? new Date(endDate) : project.endDate;
  if (effectiveEnd < effectiveStart) {
    throw new AppError('End date cannot be before the start date.', 400);
  }

  // Whitelist updatable fields — never let the body overwrite createdBy.
  const updatable: (keyof IProject)[] = [
    'title',
    'client',
    'description',
    'startDate',
    'endDate',
    'budget',
    'status',
    'tags',
  ];
  for (const field of updatable) {
    if (req.body[field] !== undefined) {
      (project.set as (path: string, val: unknown) => void)(field, req.body[field]);
    }
  }
  await project.save();

  res.status(200).json({
    message: 'Project updated successfully',
    data: { project },
  });
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await findProjectOr404(param(req.params.id));
  const projectId = project._id;

  // Soft check: surface a warning when active sprints exist, but still delete.
  const sprintCount = await countSprints(projectId);

  await project.deleteOne();

  res.status(200).json({
    message: 'Project deleted successfully',
    ...(sprintCount > 0
      ? { warning: `This project had ${sprintCount} sprint(s) which are now orphaned.` }
      : {}),
  });
});

export const uploadThumbnail = asyncHandler(async (req: Request, res: Response) => {
  const project = await findProjectOr404(param(req.params.id));

  if (!canManageProject(project, req.user!.id, req.user!.role)) {
    throw new AppError('You do not have permission to update this project.', 403);
  }
  if (!req.file) {
    throw new AppError('No image file was uploaded.', 400);
  }

  // Store the filename only; the file is served from /uploads/thumbnails.
  project.thumbnail = req.file.filename;
  await project.save();

  res.status(200).json({
    message: 'Thumbnail updated successfully',
    data: { thumbnail: project.thumbnail },
  });
});

export const getProjectStats = asyncHandler(async (req: Request, res: Response) => {
  const project = await findProjectOr404(param(req.params.id));
  const projectId = project._id;

  const [sprintCount, taskCounts] = await Promise.all([
    countSprints(projectId),
    aggregateTasks(projectId),
  ]);

  const progressPercent =
    taskCounts.total > 0
      ? Math.round((taskCounts.completed / taskCounts.total) * 100)
      : 0;

  res.status(200).json({
    data: {
      totalTasks: taskCounts.total,
      completedTasks: taskCounts.completed,
      progressPercent,
      totalMembers: project.members.length,
      sprintCount,
      timeLogged: taskCounts.timeLogged,
    },
  });
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const project = await findProjectOr404(param(req.params.id));
  const { userId, role } = req.body;

  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id.', 400);
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  if (project.members.some((m) => m.user.toString() === userId)) {
    throw new AppError('This user is already a member of the project.', 409);
  }

  project.members.push({ user: new Types.ObjectId(userId), role: role ?? 'member' });
  await project.save();

  res.status(200).json({
    message: 'Member added successfully',
    data: { members: project.members },
  });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const project = await findProjectOr404(param(req.params.id));
  const userId = param(req.params.userId);

  const before = project.members.length;
  project.members = project.members.filter(
    (m) => m.user.toString() !== userId,
  ) as IProject['members'];

  if (project.members.length === before) {
    throw new AppError('This user is not a member of the project.', 404);
  }
  await project.save();

  res.status(200).json({
    message: 'Member removed successfully',
    data: { members: project.members },
  });
});
