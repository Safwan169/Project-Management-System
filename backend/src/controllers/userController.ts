import { Request, Response } from 'express';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';

// Read-only user lookup used by pickers across the app.
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;
  const filter: Record<string, unknown> = { isActive: true };

  if (search && typeof search === 'string' && search.trim()) {
    const term = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: term }, { email: term }];
  }

  const users = await User.find(filter).select('name email role avatar department').limit(50);
  res.status(200).json({ data: { users } });
});
