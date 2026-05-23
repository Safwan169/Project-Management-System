import api from './axios';
import type { ID, User, UserRole } from '@/types';

interface Envelope<T> {
  message?: string;
  data: T;
}

export interface SummaryReport {
  activeProjects: number;
  completedProjectsThisMonth: number;
  totalTasksAcrossProjects: number;
  overdueTasks: number;
  totalHoursLoggedThisMonth: number;
  topContributors: {
    userId: ID;
    name: string;
    avatar: string | null;
    hoursLogged: number;
    tasksCompleted: number;
  }[];
  projectStatusBreakdown: {
    planned: number;
    active: number;
    completed: number;
    archived: number;
  };
}

export interface ProjectReport {
  project: {
    id: ID;
    title: string;
    status: string;
    startDate: string;
    endDate: string;
    budget?: number;
  };
  taskStats: {
    total: number;
    todo: number;
    inprogress: number;
    review: number;
    done: number;
    overdue: number;
  };
  progressPercent: number;
  sprintBreakdown: {
    sprintId: ID;
    title: string;
    sprintNumber: number;
    taskCount: number;
    completedCount: number;
    progressPercent: number;
  }[];
  memberContributions: {
    userId: ID;
    name: string;
    avatar: string | null;
    tasksAssigned: number;
    tasksCompleted: number;
    hoursLogged: number;
  }[];
  timeLoggedTotal: number;
  timeLoggedByUser: { userId: ID; name: string; hours: number }[];
}

export interface UserReport {
  user: { id: ID; name: string; email: string; role: UserRole; avatar?: string };
  projectsCount: number;
  tasksAssigned: number;
  tasksCompleted: number;
  completionRate: number;
  totalHoursLogged: number;
  tasksByPriority: { low: number; medium: number; high: number; critical: number };
  recentActivity: {
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
  }[];
}

export async function fetchSummaryReport(): Promise<SummaryReport> {
  const { data } = await api.get<Envelope<SummaryReport>>('/reports/summary');
  return data.data;
}

export async function fetchProjectReport(projectId: string): Promise<ProjectReport> {
  const { data } = await api.get<Envelope<ProjectReport>>(`/reports/project/${projectId}`);
  return data.data;
}

export async function fetchUserReport(userId: string): Promise<UserReport> {
  const { data } = await api.get<Envelope<UserReport>>(`/reports/user/${userId}`);
  return data.data;
}
