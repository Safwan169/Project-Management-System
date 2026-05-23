import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

async function findUserOr404(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid user id.', 400);
  }
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found.', 404);
  return user;
}

// Read-only lookup. Members can search the directory but get a leaner record.
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, role, department } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const filter: Record<string, unknown> = {};

  // Members only see active users; admin/manager can filter by status.
  const requesterRole = req.user?.role;
  if (requesterRole === 'admin' || requesterRole === 'manager') {
    if (req.query.isActive === 'true') filter.isActive = true;
    else if (req.query.isActive === 'false') filter.isActive = false;
  } else {
    filter.isActive = true;
  }

  if (role && typeof role === 'string') filter.role = role;
  if (department && typeof department === 'string') filter.department = department;
  if (search && typeof search === 'string' && search.trim()) {
    const term = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: term }, { email: term }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email role avatar department skills isActive lastLogin createdAt')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    data: {
      users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    },
  });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const id = param(req.params.id);
  const user = await findUserOr404(id);

  const isSelf = req.user!.id === id;
  const canView =
    isSelf || req.user!.role === 'admin' || req.user!.role === 'manager';
  if (!canView) {
    throw new AppError('You do not have permission to view this profile.', 403);
  }

  res.status(200).json({ data: { user: user.toSafeObject() } });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = param(req.params.id);
  const user = await findUserOr404(id);
  const isSelf = req.user!.id === id;
  const isAdmin = req.user!.role === 'admin';

  if (!isSelf && !isAdmin) {
    throw new AppError('You do not have permission to update this user.', 403);
  }

  // Members can only edit their own basic profile fields.
  const memberFields = ['name', 'department', 'skills', 'avatar'] as const;
  const adminFields = [...memberFields, 'role', 'isActive', 'email'] as const;
  const allowed = isAdmin ? adminFields : memberFields;

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      (user.set as (path: string, val: unknown) => void)(field, req.body[field]);
    }
  }

  // Admin-only password reset; the pre-save hook re-hashes.
  if (isAdmin && typeof req.body.password === 'string' && req.body.password.length >= 8) {
    user.password = req.body.password;
  }

  await user.save();
  res.status(200).json({
    message: 'User updated successfully',
    data: { user: user.toSafeObject() },
  });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = param(req.params.id);
  if (req.user!.id === id) {
    throw new AppError('You cannot deactivate your own account.', 400);
  }

  const user = await findUserOr404(id);
  user.isActive = false;
  await user.save();

  res.status(200).json({ message: 'User deactivated successfully' });
});

export const uploadUserAvatar = asyncHandler(async (req: Request, res: Response) => {
  const id = param(req.params.id);
  const user = await findUserOr404(id);
  const isSelf = req.user!.id === id;
  if (!isSelf && req.user!.role !== 'admin') {
    throw new AppError('You do not have permission to update this avatar.', 403);
  }
  if (!req.file) {
    throw new AppError('No image file was uploaded.', 400);
  }

  user.avatar = req.file.filename;
  await user.save();

  res.status(200).json({
    message: 'Avatar updated successfully',
    data: { avatar: user.avatar },
  });
});

export const getUserStats = asyncHandler(async (req: Request, res: Response) => {
  const id = param(req.params.id);
  await findUserOr404(id);
  const userObjId = new Types.ObjectId(id);

  const [projectCount, taskStats] = await Promise.all([
    Project.countDocuments({
      $or: [{ createdBy: userObjId }, { 'members.user': userObjId }],
    }),
    Task.aggregate<{ assigned: number; completed: number; hours: number }>([
      { $match: { assignees: userObjId } },
      {
        $group: {
          _id: null,
          assigned: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          hours: { $sum: { $sum: '$timeLogs.hours' } },
        },
      },
    ]),
  ]);

  const stats = taskStats[0] ?? { assigned: 0, completed: 0, hours: 0 };
  res.status(200).json({
    data: {
      projectCount,
      tasksAssigned: stats.assigned,
      tasksCompleted: stats.completed,
      totalHoursLogged: stats.hours,
    },
  });
});
