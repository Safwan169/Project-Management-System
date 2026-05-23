import api from './axios';
import type { Task, User } from '@/types';

interface Envelope<T> {
  message?: string;
  data: T;
}

export interface TaskFilters {
  project?: string;
  sprint?: string;
  assignee?: string;
  status?: string;
  priority?: string;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  limit?: number;
}

export interface TaskListResult {
  tasks: Task[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface TaskInput {
  title: string;
  description?: string;
  project: string;
  sprint: string;
  assignees?: string[];
  estimate?: number;
  priority?: string;
  status?: string;
  dueDate?: string;
  tags?: string[];
}

export async function fetchTasks(filters: TaskFilters): Promise<TaskListResult> {
  const { data } = await api.get<Envelope<TaskListResult>>('/tasks', { params: filters });
  return data.data;
}

export async function fetchTask(id: string): Promise<Task> {
  const { data } = await api.get<Envelope<{ task: Task }>>(`/tasks/${id}`);
  return data.data.task;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data } = await api.post<Envelope<{ task: Task }>>('/tasks', input);
  return data.data.task;
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const { data } = await api.patch<Envelope<{ task: Task }>>(`/tasks/${id}`, input);
  return data.data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}

export async function uploadTaskAttachment(id: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  await api.post(`/tasks/${id}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteTaskAttachment(id: string, attachmentId: string): Promise<void> {
  await api.delete(`/tasks/${id}/attachments/${attachmentId}`);
}

export async function addTaskComment(
  id: string,
  text: string,
  parentComment?: string,
): Promise<void> {
  await api.post(`/tasks/${id}/comments`, { text, parentComment });
}

export async function editTaskComment(
  id: string,
  commentId: string,
  text: string,
): Promise<void> {
  await api.patch(`/tasks/${id}/comments/${commentId}`, { text });
}

export async function deleteTaskComment(id: string, commentId: string): Promise<void> {
  await api.delete(`/tasks/${id}/comments/${commentId}`);
}

export async function logTaskTime(
  id: string,
  payload: { hours: number; date?: string; note?: string },
): Promise<void> {
  await api.post(`/tasks/${id}/time-log`, payload);
}

export interface SubtaskBatch {
  add?: { title: string }[];
  toggle?: { id: string; completed: boolean }[];
  remove?: string[];
}

export async function updateSubtasks(id: string, batch: SubtaskBatch): Promise<void> {
  await api.patch(`/tasks/${id}/subtasks`, batch);
}

export interface ReorderItem {
  id: string;
  status: string;
  order: number;
}

export async function reorderTasks(items: ReorderItem[]): Promise<void> {
  await api.patch('/tasks/reorder', { items });
}

export async function fetchUsers(search?: string): Promise<User[]> {
  const { data } = await api.get<Envelope<{ users: User[] }>>('/users', {
    params: search ? { search } : undefined,
  });
  return data.data.users;
}
