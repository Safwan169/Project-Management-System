export type UserRole = 'admin' | 'manager' | 'member';

// Payload stored inside the JWT.
export interface JwtPayload {
  id: string;
  role: UserRole;
}

// Shape attached to req.user after the protect middleware runs.
export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}
