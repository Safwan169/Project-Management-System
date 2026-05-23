import { Request, Response, NextFunction } from 'express';

// Adds `success: true` to every successful JSON response without forcing
// each controller to know about it. Errors (handled by errorHandler) set
// their own `success: false`, and we don't override an explicit success.
export function responseWrapper(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      !('success' in (body as Record<string, unknown>)) &&
      res.statusCode < 400
    ) {
      return originalJson({ success: true, ...(body as Record<string, unknown>) });
    }
    return originalJson(body);
  };
  next();
}
