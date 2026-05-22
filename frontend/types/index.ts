// Shared domain types mirroring the backend's MongoDB documents.
// Date fields arrive as ISO strings. Reference fields are typed `Ref<T>`
// so the same type works whether the API returns an id or a populated doc.

export type ID = string;

export type Ref<T> = ID | T;

export type UserRole = 'admin' | 'manager' | 'member';

export interface User {
  _id: ID;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  _id: ID;
  name: string;
  description?: string;
  owner: Ref<User>;
  members: Ref<User>[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  _id: ID;
  name: string;
  key: string;
  description?: string;
  status: ProjectStatus;
  team: Ref<Team>;
  lead: Ref<User>;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface Sprint {
  _id: ID;
  name: string;
  goal?: string;
  status: SprintStatus;
  project: Ref<Project>;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  _id: ID;
  key: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: Ref<Project>;
  sprint?: Ref<Sprint> | null;
  assignee?: Ref<User> | null;
  reporter: Ref<User>;
  estimate?: number;
  labels: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
