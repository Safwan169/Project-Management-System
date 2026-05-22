import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { User } from '../models/User';
import { UserRole } from '../types';

// Validates the Bearer token and attaches req.user.
// Loads the user from the DB so a deactivated/deleted account is rejected
// even while its token is still otherwise valid.
export const protect = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractTokenFromHeader(req);
    if (!token) {
      throw new AppError('You are not logged in. Please sign in to continue.', 401);
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('Invalid or expired token. Please sign in again.', 401);
    }

    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      throw new AppError('Account no longer exists or has been deactivated.', 401);
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };
    next();
  },
);

// Like protect(), but does not reject when no/invalid token is present —
// it just leaves req.user undefined. Used by routes that behave differently
// for authenticated callers (e.g. register, where an admin may set roles).
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractTokenFromHeader(req);
    if (!token) return next();

    try {
      const payload = verifyToken(token);
      const user = await User.findById(payload.id);
      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          role: user.role,
          name: user.name,
          email: user.email,
        };
      }
    } catch {
      // Ignore a bad token here — the route stays open to anonymous callers.
    }
    next();
  },
);

// Allows the request through only if req.user.role is one of `roles`.
// Must be used after protect().
export const restrictTo =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action.', 403);
    }
    next();
  };
