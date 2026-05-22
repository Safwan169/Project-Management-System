import { Request, Response, NextFunction, RequestHandler } from 'express';

// Wraps an async route handler so rejected promises reach next()
// instead of crashing the process. Saves a try/catch in every controller.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
