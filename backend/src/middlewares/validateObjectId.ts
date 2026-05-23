import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../utils/AppError';

// Guards route params that should be Mongo ObjectIds — rejects bad input
// with a 400 before it hits a controller.
export function validateObjectId(...params: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const name of params) {
      const raw = req.params[name];
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (value && !Types.ObjectId.isValid(value)) {
        return next(new AppError(`Invalid ${name}.`, 400));
      }
    }
    next();
  };
}
