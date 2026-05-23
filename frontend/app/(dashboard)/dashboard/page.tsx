'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ListTodo,
  AlertTriangle,
  Clock,
  FolderKanban,
  CalendarDays,
  Activity,
  ArrowRight,
} from 'lucide-react';
import type { Task, TaskStatus, User } from '@/types';
import { fetchDashboard, type DashboardActivityEntry } from '@/lib/dashboard-api';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const priorityBadge: Record<string, 'gray' | 'blue' | 'amber' | 'red'> = {
  low: 'gray',
  medium: 'blue',
  high: 'amber',
  critical: 'red',
};

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const canSeeAdminOverview = user?.role === 'admin' || user?.role === 'manager';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const today = useMemo(() => new Date(), []);
  const stats = data?.stats;

  const statCards = [
    {
      label: 'My Open Tasks',
      value: stats?.openTasks ?? 0,
      icon: ListTodo,
      tone: 'text-primary-600 bg-primary-50',
    },
    {
      label: 'Overdue Tasks',
      value: stats?.overdueTasks ?? 0,
      icon: AlertTriangle,
      tone: 'text-red-600 bg-red-50',
    },
    {
      label: 'Hours This Week',
      value: stats?.hoursThisWeek ?? 0,
      icon: Clock,
      tone: 'text-amber-600 bg-amber-50',
    },
    {
      label: "Projects I'm In",
      value: stats?.projectCount ?? 0,
      icon: FolderKanban,
      tone: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting(today.getHours())}, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted">{format(today, "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} padding="sm">
            <div className="flex items-center gap-3">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tone)}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted">{label}</p>
                <p className="text-lg font-semibold text-foreground">
                  {isLoading ? '—' : value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MyTasksSection
            byStatus={data?.myTasksByStatus}
            isLoading={isLoading}
          />
        </div>
        <div className="space-y-6">
          <UpcomingSection tasks={data?.upcoming ?? []} isLoading={isLoading} />
        </div>
      </div>

      <RecentActivitySection items={data?.recentActivity ?? []} isLoading={isLoading} />

      {canSeeAdminOverview && (
        <AdminProjectOverview
          projects={data?.activeProjects ?? []}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

interface MyTasksSectionProps {
  byStatus?: Record<TaskStatus, Task[]>;
  isLoading: boolean;
}

function MyTasksSection({ byStatus, isLoading }: MyTasksSectionProps) {
  const order: TaskStatus[] = ['inprogress', 'todo', 'review'];

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary-600" />
          <h2 className="text-base font-semibold text-foreground">My Tasks</h2>
        </div>
        <Link
          href="/my-tasks"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {order.map((status) => {
            const tasks = byStatus?.[status] ?? [];
            if (tasks.length === 0) return null;
            return (
              <div key={status}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {statusLabel[status]}
                </h3>
                <ul className="space-y-1.5">
                  {tasks.map((task) => (
                    <li key={task._id}>
                      <Link
                        href={`/tasks?taskId=${task._id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-surface-border hover:bg-surface-subtle"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {task.title}
                          </p>
                          {task.dueDate && (
                            <p className="text-[11px] text-muted">
                              Due {formatDate(task.dueDate)}
                            </p>
                          )}
                        </div>
                        <Badge color={priorityBadge[task.priority] ?? 'gray'}>
                          {task.priority}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {order.every((s) => (byStatus?.[s]?.length ?? 0) === 0) && (
            <p className="py-6 text-center text-sm text-muted">
              You have no open tasks right now.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function UpcomingSection({ tasks, isLoading }: { tasks: Task[]; isLoading: boolean }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-amber-600" />
        <h2 className="text-base font-semibold text-foreground">Upcoming</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">No deadlines in the next 7 days.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const projectTitle =
              typeof task.project === 'string' ? '' : task.project.title;
            return (
              <li
                key={task._id}
                className="flex items-start justify-between gap-2 rounded-lg border border-surface-border p-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/tasks?taskId=${task._id}`}
                    className="block truncate text-sm font-medium text-foreground hover:text-primary-600"
                  >
                    {task.title}
                  </Link>
                  <p className="truncate text-[11px] text-muted">{projectTitle}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge color={priorityBadge[task.priority] ?? 'gray'}>{task.priority}</Badge>
                  <p className="mt-0.5 text-[11px] text-muted">{formatDate(task.dueDate)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function RecentActivitySection({
  items,
  isLoading,
}: {
  items: DashboardActivityEntry[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary-600" />
        <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">No recent activity.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const u = typeof item.entry.user === 'string' ? null : (item.entry.user as User);
            const detail =
              item.entry.oldValue && item.entry.newValue
                ? `${item.entry.oldValue} → ${item.entry.newValue}`
                : item.entry.newValue ?? '';
            return (
              <li key={item.entry._id} className="flex items-start gap-3 text-xs">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground">
                    <span className="font-medium">{u?.name ?? 'Someone'}</span>{' '}
                    <span className="text-muted">{item.entry.action}</span>{' '}
                    <Link
                      href={`/tasks?taskId=${item.taskId}`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      {item.taskTitle}
                    </Link>
                    {detail && <span className="text-muted"> · {detail}</span>}
                  </p>
                  <p className="text-[11px] text-muted">
                    {formatDistanceToNow(new Date(item.entry.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

interface AdminOverviewProps {
  projects: { _id: string; title: string; progress: number }[];
  isLoading: boolean;
}

function AdminProjectOverview({ projects, isLoading }: AdminOverviewProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary-600" />
          <h2 className="text-base font-semibold text-foreground">Active Projects</h2>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">No active projects.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p._id}
              href={`/projects/${p._id}`}
              className="rounded-lg border border-surface-border p-3 transition-colors hover:bg-surface-subtle"
            >
              <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
              <ProgressBar value={p.progress} className="mt-2" showLabel={false} />
              <p className="mt-1 text-[11px] text-muted">{p.progress}% complete</p>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
