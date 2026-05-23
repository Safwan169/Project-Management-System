import api from './axios';
import type { User } from '@/types';

interface Envelope<T> {
  message?: string;
  data: T;
}

export interface UserFilters {
  search?: string;
  role?: string;
  department?: string;
  isActive?: 'true' | 'false';
  page?: number;
  limit?: number;
}

export interface UserListResult {
  users: User[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface UserStats {
  projectCount: number;
  tasksAssigned: number;
  tasksCompleted: number;
  totalHoursLogged: number;
}

// Admin/manager update payload; members can only send name/department/skills/avatar.
export interface UserUpdateInput {
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  skills?: string[];
  isActive?: boolean;
  password?: string;
}

export async function fetchTeamUsers(filters: UserFilters): Promise<UserListResult> {
  const { data } = await api.get<Envelope<UserListResult>>('/users', { params: filters });
  return data.data;
}

export async function fetchUserProfile(id: string): Promise<User> {
  const { data } = await api.get<Envelope<{ user: User }>>(`/users/${id}`);
  return data.data.user;
}

export async function updateUserProfile(id: string, input: UserUpdateInput): Promise<User> {
  const { data } = await api.patch<Envelope<{ user: User }>>(`/users/${id}`, input);
  return data.data.user;
}

export async function deactivateUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function uploadUserAvatar(id: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('avatar', file);
  const { data } = await api.post<Envelope<{ avatar: string }>>(`/users/${id}/avatar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.avatar;
}

export async function fetchUserStats(id: string): Promise<UserStats> {
  const { data } = await api.get<Envelope<UserStats>>(`/users/${id}/stats`);
  return data.data;
}
