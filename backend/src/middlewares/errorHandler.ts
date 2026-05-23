import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError';
import { isDevelopment } from '../config/env';

interface ErrorBody {
  success: false;
  message: string;
  errors?: Record<string, string>;
  stack?: string;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let status = 500;
  const body: ErrorBody = { success: false, message: 'Internal server error' };

  if (err instanceof AppError) {
    status = err.statusCode;
    body.message = err.message;
  } else if (err instanceof MongooseError.ValidationError) {
    status = 422;
    body.message = 'Validation failed.';
    body.errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message]),
    );
  } else if (err instanceof MongooseError.CastError) {
    status = 400;
    body.message = `Invalid ${err.path}: ${String(err.value)}`;
  } else if (err.name === 'MongoServerError' && (err as { code?: number }).code === 11000) {
    status = 409;
    body.message = 'A record with these details already exists.';
  } else if (err instanceof TokenExpiredError) {
    status = 401;
    body.message = 'Your session has expired. Please sign in again.';
  } else if (err instanceof JsonWebTokenError) {
    status = 401;
    body.message = 'Invalid authentication token.';
  } else if (err instanceof MulterError) {
    status = 400;
    body.message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : `Upload error: ${err.message}`;
  } else if (err.message.startsWith('Unsupported file type')) {
    status = 400;
    body.message = err.message;
  }

  // Log unexpected 500s; don't spam logs for client errors.
  if (status >= 500) {
    console.error('[error]', err.stack ?? err.message);
  }

  if (isDevelopment) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
