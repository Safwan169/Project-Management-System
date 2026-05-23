import api from './axios';
import type { Task, TaskStatus, User, ID } from '@/types';

interface Envelope<T> {
  message?: string;
  data: T;
}

export interface DashboardActivityEntry {
  taskId: ID;
  taskTitle: string;
  entry: {
    _id: ID;
    user: ID | User;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    timestamp: string;
  };
}

export interface DashboardActiveProject {
  _id: ID;
  title: string;
  progress: number;
}

export interface DashboardPayload {
  stats: {
    openTasks: number;
    overdueTasks: number;
    hoursThisWeek: number;
    projectCount: number;
  };
  myTasksByStatus: Record<TaskStatus, Task[]>;
  upcoming: Task[];
  recentActivity: DashboardActivityEntry[];
  activeProjects: DashboardActiveProject[];
}

export async function fetchDashboard(): Promise<DashboardPayload> {
  const { data } = await api.get<Envelope<DashboardPayload>>('/dashboard');
  return data.data;
}
