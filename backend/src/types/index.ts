export type UserRole = 'admin' | 'manager' | 'member';

// Payload stored inside the JWT.
export interface JwtPayload {
  id: string;
  role: UserRole;
}

// What protect() attaches to the request after validating the token.
export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}
