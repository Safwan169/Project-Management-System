import api from './axios';
import type { Project, ProjectStats, User } from '@/types';

interface Envelope<T> {
  message?: string;
  data: T;
  warning?: string;
}

export interface ProjectFilters {
  status?: string;
  client?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProjectListResult {
  projects: Project[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface ProjectDetailResult {
  project: Project;
  counts: { sprints: number; tasks: number };
}

// Payload for create/update. Thumbnail is uploaded separately.
export interface ProjectInput {
  title: string;
  client: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  status: string;
}

export async function fetchProjects(filters: ProjectFilters): Promise<ProjectListResult> {
  const { data } = await api.get<Envelope<ProjectListResult>>('/projects', { params: filters });
  return data.data;
}

export async function fetchProject(id: string): Promise<ProjectDetailResult> {
  const { data } = await api.get<Envelope<ProjectDetailResult>>(`/projects/${id}`);
  return data.data;
}

export async function fetchProjectStats(id: string): Promise<ProjectStats> {
  const { data } = await api.get<Envelope<ProjectStats>>(`/projects/${id}/stats`);
  return data.data;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data } = await api.post<Envelope<{ project: Project }>>('/projects', input);
  return data.data.project;
}

export async function updateProject(id: string, input: Partial<ProjectInput>): Promise<Project> {
  const { data } = await api.patch<Envelope<{ project: Project }>>(`/projects/${id}`, input);
  return data.data.project;
}

export async function deleteProject(id: string): Promise<string | undefined> {
  const { data } = await api.delete<Envelope<never>>(`/projects/${id}`);
  return data.warning;
}

export async function uploadProjectThumbnail(id: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('thumbnail', file);
  const { data } = await api.post<Envelope<{ thumbnail: string }>>(
    `/projects/${id}/thumbnail`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data.thumbnail;
}

export async function addProjectMember(
  id: string,
  userId: string,
  role: string,
): Promise<void> {
  await api.post(`/projects/${id}/members`, { userId, role });
}

export async function removeProjectMember(id: string, userId: string): Promise<void> {
  await api.delete(`/projects/${id}/members/${userId}`);
}

export async function searchUsers(query: string): Promise<User[]> {
  const { data } = await api.get<Envelope<{ users: User[] }>>('/users', {
    params: { search: query },
  });
  return data.data.users;
}
