import { AuthUser } from './index';

// Make req.user available and typed on every Express request.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
