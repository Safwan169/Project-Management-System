import api from './axios';
import type { AuthResult, User, UserRole } from '@/types';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface LoginPayload {
  email: string;
  password: string;
}

// The backend wraps every response as { message?, data }.
interface Envelope<T> {
  message?: string;
  data: T;
}

export async function registerRequest(payload: RegisterPayload): Promise<AuthResult> {
  const { data } = await api.post<Envelope<AuthResult>>('/auth/register', payload);
  return data.data;
}

export async function loginRequest(payload: LoginPayload): Promise<AuthResult> {
  const { data } = await api.post<Envelope<AuthResult>>('/auth/login', payload);
  return data.data;
}

export async function getMeRequest(): Promise<User> {
  const { data } = await api.get<Envelope<{ user: User }>>('/auth/me');
  return data.data.user;
}
