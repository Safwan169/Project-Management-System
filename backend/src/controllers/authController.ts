import { Request, Response } from 'express';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, department, skills } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  let resolvedRole: 'admin' | 'manager' | 'member' = 'member';
  if (role && role !== 'member') {
    if (req.user?.role !== 'admin') {
      throw new AppError('Only an admin can assign the admin or manager role.', 403);
    }
    resolvedRole = role;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: resolvedRole,
    department,
    skills,
  });

  const token = signToken(user._id.toString(), user.role);
  res.status(201).json({
    message: 'Account created successfully',
    data: { user: user.toSafeObject(), token },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Incorrect email or password.', 401);
  }
  if (!user.isActive) {
    throw new AppError('This account has been deactivated.', 403);
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id.toString(), user.role);
  res.status(200).json({
    message: 'Signed in successfully',
    data: { user: user.toSafeObject(), token },
  });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // req.user comes from the JWT; reload from the DB for the full, fresh record.
  const user = await User.findById(req.user!.id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  res.status(200).json({ data: { user: user.toSafeObject() } });
});

// PATCH /api/auth/update-password
export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user!.id).select('+password');
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Your current password is incorrect.', 401);
  }

  // Re-hashed by the pre-save hook since the password field changed.
  user.password = newPassword;
  await user.save();

  // Issue a fresh token so the new session is clearly post-change.
  const token = signToken(user._id.toString(), user.role);
  res.status(200).json({
    message: 'Password updated successfully',
    data: { token },
  });
});
