import jwt, { SignOptions } from 'jsonwebtoken';
import { Request } from 'express';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../types';

export function signToken(userId: string, role: UserRole): string {
  const payload: JwtPayload = { id: userId, role };
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

// Returns the decoded payload, or throws if the token is invalid/expired.
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || !decoded.id || !decoded.role) {
    throw new Error('Malformed token payload');
  }
  return { id: decoded.id, role: decoded.role };
}

// Pulls the token out of an "Authorization: Bearer <token>" header.
export function extractTokenFromHeader(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}
