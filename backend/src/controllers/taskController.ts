import { Request, Response } from 'express';
import { Types } from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { Task, ITask, ActivityEntry, TaskStatus } from '../models/Task';
import { Project } from '../models/Project';
import { Sprint } from '../models/Sprint';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { ATTACHMENT_DIR } from '../config/multer';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

async function findTaskOr404(id: string): Promise<ITask> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid task id.', 400);
  }
  const task = await Task.findById(id);
  if (!task) throw new AppError('Task not found.', 404);
  return task;
}

async function canEditTask(task: ITask, userId: string, role: string): Promise<boolean> {
  if (role === 'admin' || role === 'manager') return true;
  if (task.createdBy.toString() === userId) return true;
  if (task.assignees.some((a) => a.toString() === userId)) return true;
  const project = await Project.findById(task.project).select('members');
  return Boolean(
    project?.members.some((m) => m.user.toString() === userId && m.role === 'manager'),
  );
}

function logActivity(task: ITask, entry: Omit<ActivityEntry, '_id' | 'timestamp'>): void {
  task.activityLog.push({ ...entry, timestamp: new Date() } as ActivityEntry);
}

async function removeFile(absPath: string): Promise<void> {
  try {
    await fs.unlink(absPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[tasks] could not remove file ${absPath}: ${message}`);
  }
}

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    project: projectId,
    sprint: sprintId,
    assignees,
    estimate,
    priority,
    status,
    dueDate,
    tags,
  } = req.body;

  if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(sprintId)) {
    throw new AppError('A valid project and sprint are required.', 400);
  }

  // Verify the sprint belongs to the given project.
  const sprint = await Sprint.findById(sprintId).select('project');
  if (!sprint || sprint.project.toString() !== projectId) {
    throw new AppError('The chosen sprint does not belong to that project.', 400);
  }

  // Append at the bottom of its column.
  const resolvedStatus = status ?? 'todo';
  const last = await Task.findOne({ sprint: sprintId, status: resolvedStatus })
    .sort({ order: -1 })
    .select('order');
  const nextOrder = (last?.order ?? -1) + 1;

  const task = await Task.create({
    title,
    description,
    project: projectId,
    sprint: sprintId,
    assignees: Array.isArray(assignees) ? assignees : [],
    createdBy: req.user!.id,
    estimate,
    priority,
    status: resolvedStatus,
    order: nextOrder,
    dueDate,
    tags,
    activityLog: [
      {
        user: new Types.ObjectId(req.user!.id),
        action: 'created',
        timestamp: new Date(),
      },
    ],
  });

  res.status(201).json({
    message: 'Task created successfully',
    data: { task },
  });
});

export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const { project: projectId, sprint: sprintId, assignee, status, priority, search } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const filter: Record<string, unknown> = {};
  if (projectId) filter.project = projectId;
  if (sprintId) filter.sprint = sprintId;
  if (assignee) filter.assignees = assignee;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (search) {
    filter.title = new RegExp(String(search).trim(), 'i');
  }

  // Either bound is optional for the due-date range filter.
  if (req.query.dueFrom || req.query.dueTo) {
    const due: Record<string, Date> = {};
    if (req.query.dueFrom) due.$gte = new Date(String(req.query.dueFrom));
    if (req.query.dueTo) due.$lte = new Date(String(req.query.dueTo));
    filter.dueDate = due;
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ status: 1, order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignees', 'name avatar'),
    Task.countDocuments(filter),
  ]);

  res.status(200).json({
    data: {
      tasks,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    },
  });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const id = param(req.params.id);
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid task id.', 400);
  }

  const task = await Task.findById(id)
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('comments.user', 'name email avatar')
    .populate('activityLog.user', 'name avatar')
    .populate('timeLogs.user', 'name avatar')
    .populate('attachments.uploadedBy', 'name avatar');
  if (!task) throw new AppError('Task not found.', 404);

  // Thread comments in JS so populate user docs are preserved.
  type RawComment = Record<string, unknown> & {
    _id: Types.ObjectId;
    parentComment?: Types.ObjectId;
  };
  const raw = task.toObject() as unknown as Record<string, unknown>;
  const allComments = (raw.comments as RawComment[]) ?? [];
  const byParent = new Map<string, RawComment[]>();
  for (const c of allComments) {
    const key = c.parentComment?.toString() ?? 'root';
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const threaded = (byParent.get('root') ?? []).map((c) => ({
    ...c,
    replies: byParent.get(c._id.toString()) ?? [],
  }));
  raw.comments = threaded;

  res.status(200).json({ data: { task: raw } });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));
  if (!(await canEditTask(task, req.user!.id, req.user!.role))) {
    throw new AppError('You do not have permission to update this task.', 403);
  }

  const userId = new Types.ObjectId(req.user!.id);

  // Moving to done requires passing review first, unless admin/manager.
  if (req.body.status === 'done' && task.status !== 'review') {
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      logActivity(task, {
        user: userId,
        action: 'changed status',
        field: 'status',
        oldValue: task.status,
        newValue: 'review',
      });
      task.status = 'review';
      await task.save();
      res.status(200).json({
        message: 'Task moved to review — a manager must approve "done".',
        data: { task },
      });
      return;
    }
  }

  // Diff watched fields before applying so we capture old and new values.
  const watched: { field: keyof ITask; label: string }[] = [
    { field: 'status', label: 'status' },
    { field: 'priority', label: 'priority' },
  ];
  for (const { field, label } of watched) {
    if (req.body[field] !== undefined && req.body[field] !== task[field]) {
      logActivity(task, {
        user: userId,
        action: `changed ${label}`,
        field: label,
        oldValue: String(task[field]),
        newValue: String(req.body[field]),
      });
    }
  }

  if (Array.isArray(req.body.assignees)) {
    const oldIds = task.assignees.map((a) => a.toString()).sort();
    const newIds = (req.body.assignees as string[]).map((a) => a.toString()).sort();
    if (oldIds.join(',') !== newIds.join(',')) {
      logActivity(task, {
        user: userId,
        action: 'changed assignees',
        field: 'assignees',
        oldValue: oldIds.join(', ') || '(none)',
        newValue: newIds.join(', ') || '(none)',
      });
    }
  }

  // createdBy, project, sprint are immutable via this endpoint.
  const updatable: (keyof ITask)[] = [
    'title',
    'description',
    'assignees',
    'estimate',
    'priority',
    'status',
    'dueDate',
    'tags',
    'isBlocked',
    'blockedReason',
  ];
  for (const field of updatable) {
    if (req.body[field] !== undefined) {
      (task.set as (path: string, val: unknown) => void)(field, req.body[field]);
    }
  }

  await task.save();
  res.status(200).json({
    message: 'Task updated successfully',
    data: { task },
  });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));

  if (task.attachments.length > 0) {
    const dir = path.join(ATTACHMENT_DIR, task._id.toString());
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[tasks] could not remove attachment folder ${dir}: ${message}`);
    }
  }

  await task.deleteOne();
  res.status(200).json({ message: 'Task deleted successfully' });
});

export const uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));
  if (!req.file) throw new AppError('No file was uploaded.', 400);

  task.attachments.push({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploadedBy: new Types.ObjectId(req.user!.id),
    uploadedAt: new Date(),
  } as ITask['attachments'][number]);

  logActivity(task, {
    user: new Types.ObjectId(req.user!.id),
    action: 'uploaded attachment',
    newValue: req.file.originalname,
  });

  await task.save();
  res.status(201).json({
    message: 'Attachment uploaded successfully',
    data: { attachment: task.attachments[task.attachments.length - 1] },
  });
});

export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));
  const attachmentId = param(req.params.attachmentId);
  const attachment = task.attachments.id(attachmentId);
  if (!attachment) throw new AppError('Attachment not found.', 404);

  const isOwner = attachment.uploadedBy.toString() === req.user!.id;
  if (!isOwner && req.user!.role !== 'admin' && req.user!.role !== 'manager') {
    throw new AppError('You do not have permission to delete this attachment.', 403);
  }

  const absPath = path.join(ATTACHMENT_DIR, task._id.toString(), attachment.filename);
  await removeFile(absPath);

  const removedName = attachment.originalName;
  attachment.deleteOne();

  logActivity(task, {
    user: new Types.ObjectId(req.user!.id),
    action: 'removed attachment',
    oldValue: removedName,
  });

  await task.save();
  res.status(200).json({ message: 'Attachment deleted successfully' });
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));
  const { text, parentComment } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AppError('Comment text is required.', 400);
  }

  if (parentComment) {
    if (!Types.ObjectId.isValid(parentComment) || !task.comments.id(parentComment)) {
      throw new AppError('Parent comment not found.', 400);
    }
  }

  task.comments.push({
    user: new Types.ObjectId(req.user!.id),
    text: text.trim(),
    createdAt: new Date(),
    parentComment: parentComment ? new Types.ObjectId(parentComment) : undefined,
  } as ITask['comments'][number]);

  await task.save();
  res.status(201).json({
    message: 'Comment added successfully',
    data: { comment: task.comments[task.comments.length - 1] },
  });
});

export const editComment = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));
  const comment = task.comments.id(param(req.params.commentId));
  if (!comment) throw new AppError('Comment not found.', 404);

  if (comment.user.toString() !== req.user!.id) {
    throw new AppError('Only the comment author can edit this comment.', 403);
  }
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AppError('Comment text is required.', 400);
  }

  comment.text = text.trim();
  comment.editedAt = new Date();
  await task.save();

  res.status(200).json({
    message: 'Comment updated successfully',
    data: { comment },
  });
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));
  const comment = task.comments.id(param(req.params.commentId));
  if (!comment) throw new AppError('Comment not found.', 404);

  const isAuthor = comment.user.toString() === req.user!.id;
  if (!isAuthor && req.user!.role !== 'admin' && req.user!.role !== 'manager') {
    throw new AppError('You do not have permission to delete this comment.', 403);
  }

  comment.deleteOne();
  await task.save();
  res.status(200).json({ message: 'Comment deleted successfully' });
});

export const logTime = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));
  const { hours, date, note } = req.body;

  const numericHours = Number(hours);
  if (!Number.isFinite(numericHours) || numericHours <= 0) {
    throw new AppError('Hours must be a number greater than 0.', 400);
  }

  task.timeLogs.push({
    user: new Types.ObjectId(req.user!.id),
    hours: numericHours,
    date: date ? new Date(date) : new Date(),
    note: typeof note === 'string' ? note.trim() : undefined,
  } as ITask['timeLogs'][number]);

  logActivity(task, {
    user: new Types.ObjectId(req.user!.id),
    action: 'logged time',
    newValue: `${numericHours}h`,
  });

  await task.save();
  res.status(201).json({
    message: 'Time logged successfully',
    data: { timeLog: task.timeLogs[task.timeLogs.length - 1] },
  });
});

// Batch subtask edits: add, toggle completed, or remove by id.
export const updateSubtasks = asyncHandler(async (req: Request, res: Response) => {
  const task = await findTaskOr404(param(req.params.id));
  if (!(await canEditTask(task, req.user!.id, req.user!.role))) {
    throw new AppError('You do not have permission to update subtasks.', 403);
  }

  const { add, toggle, remove } = req.body as {
    add?: { title: string }[];
    toggle?: { id: string; completed: boolean }[];
    remove?: string[];
  };

  if (Array.isArray(add)) {
    for (const item of add) {
      if (item && typeof item.title === 'string' && item.title.trim()) {
        task.subtasks.push({
          title: item.title.trim(),
          completed: false,
          createdAt: new Date(),
        } as ITask['subtasks'][number]);
      }
    }
  }
  if (Array.isArray(toggle)) {
    for (const { id, completed } of toggle) {
      const sub = task.subtasks.id(id);
      if (sub) sub.completed = Boolean(completed);
    }
  }
  if (Array.isArray(remove)) {
    for (const id of remove) {
      task.subtasks.id(id)?.deleteOne();
    }
  }

  await task.save();
  res.status(200).json({
    message: 'Subtasks updated successfully',
    data: { subtasks: task.subtasks },
  });
});

// Bulk reorder kanban cards. Body: { items: [{ id, status, order }, ...] }
// Each id gets its status and order overwritten. Same status-transition rule
// as updateTask: a non-manager moving into 'done' is bounced to 'review'.
export const reorderTasks = asyncHandler(async (req: Request, res: Response) => {
  const items = (req.body?.items ?? []) as { id: string; status: string; order: number }[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Provide a non-empty "items" array.', 400);
  }

  const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'manager';

  const ops = items
    .filter((it) => Types.ObjectId.isValid(it.id))
    .map((it) => {
      const status: TaskStatus =
        !isPrivileged && it.status === 'done' ? 'review' : (it.status as TaskStatus);
      return {
        updateOne: {
          filter: { _id: new Types.ObjectId(it.id) },
          update: { $set: { status, order: it.order } },
        },
      };
    });

  if (ops.length === 0) {
    throw new AppError('No valid task ids in payload.', 400);
  }

  await Task.bulkWrite(ops);
  res.status(200).json({ message: 'Tasks reordered successfully' });
});
