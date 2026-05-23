// Shared domain types mirroring the backend's MongoDB documents.
// Date fields arrive as ISO strings. Reference fields are typed `Ref<T>`
// so the same type works whether the API returns an id or a populated doc.

export type ID = string;

export type Ref<T> = ID | T;

export type UserRole = 'admin' | 'manager' | 'member';

// Mirrors the backend's SafeUser (password stripped).
export interface User {
  _id: ID;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  skills?: string[];
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: User;
  token: string;
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

export type ProjectStatus = 'planned' | 'active' | 'completed' | 'archived';
export type ProjectMemberRole = 'manager' | 'member';

// A project member entry. `user` is an id on a plain list response and a
// populated User on the detail endpoint.
export interface ProjectMember {
  user: Ref<User>;
  role: ProjectMemberRole;
}

// Mirrors the backend Project model.
export interface Project {
  _id: ID;
  title: string;
  client: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  status: ProjectStatus;
  thumbnail?: string;
  createdBy: Ref<User>;
  members: ProjectMember[];
  tags?: string[];
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

// Returned by GET /api/projects/:id/stats.
export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  totalMembers: number;
  sprintCount: number;
  timeLogged: number;
}

export type SprintStatus = 'upcoming' | 'active' | 'completed';

// Mirrors the backend Sprint model. sprintNumber and order are
// server-assigned. taskCount/completedTaskCount are added by the list
// endpoint's aggregation, so they're optional here.
export interface Sprint {
  _id: ID;
  title: string;
  sprintNumber: number;
  project: Ref<Project>;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  order: number;
  goal?: string;
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskAttachment {
  _id: ID;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: Ref<User>;
  uploadedAt: string;
}

export interface TaskSubtask {
  _id: ID;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface TaskTimeLog {
  _id: ID;
  user: Ref<User>;
  hours: number;
  date: string;
  note?: string;
}

export interface TaskActivityEntry {
  _id: ID;
  user: Ref<User>;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface TaskComment {
  _id: ID;
  user: Ref<User>;
  text: string;
  createdAt: string;
  editedAt?: string;
  parentComment?: ID;
  replies?: TaskComment[];
}

export interface Task {
  _id: ID;
  title: string;
  description?: string;
  status: TaskStatus;
  order: number;
  priority: TaskPriority;
  project: Ref<Project>;
  sprint: Ref<Sprint>;
  assignees: Ref<User>[];
  createdBy: Ref<User>;
  estimate?: number;
  dueDate?: string;
  tags?: string[];
  isBlocked: boolean;
  blockedReason?: string;
  attachments: TaskAttachment[];
  subtasks: TaskSubtask[];
  timeLogs: TaskTimeLog[];
  activityLog: TaskActivityEntry[];
  comments: TaskComment[];
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
