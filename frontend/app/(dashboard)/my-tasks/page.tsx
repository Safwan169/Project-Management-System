'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, LayoutGrid, Table2, CheckSquare } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { fetchTasks } from '@/lib/tasks-api';
import { fetchProjects } from '@/lib/projects-api';
import { fetchSprints } from '@/lib/sprints-api';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { TaskTable } from '@/components/tasks/TaskTable';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';

type StatusTab = 'all' | TaskStatus;
type PriorityTab = 'all' | TaskPriority;
type ViewMode = 'list' | 'kanban';

const statusTabs: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const priorityTabs: { value: PriorityTab; label: string; dot?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low', dot: 'bg-slate-400' },
  { value: 'medium', label: 'Medium', dot: 'bg-blue-500' },
  { value: 'high', label: 'High', dot: 'bg-amber-500' },
  { value: 'critical', label: 'Critical', dot: 'bg-red-500' },
];

const VIEW_KEY = 'pms.myTasksView';

export default function MyTasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canSelfApprove = user?.role === 'admin' || user?.role === 'manager';

  const [project, setProject] = useState('');
  const [sprint, setSprint] = useState('');
  const [status, setStatus] = useState<StatusTab>('all');
  const [priority, setPriority] = useState<PriorityTab>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('kanban');

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === 'list' || saved === 'kanban') setView(saved);
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  };

  useEffect(() => {
    setSprint('');
  }, [project]);

  const { data: projectData } = useQuery({
    queryKey: ['projects', { limit: 100 }],
    queryFn: () => fetchProjects({ limit: 100 }),
  });
  const projects = projectData?.projects ?? [];

  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', project],
    queryFn: () => fetchSprints(project),
    enabled: Boolean(project),
  });

  const filters = useMemo(
    () => ({
      assignee: user?._id,
      project: project || undefined,
      sprint: sprint || undefined,
      status: status === 'all' ? undefined : status,
      priority: priority === 'all' ? undefined : priority,
      search: search.trim() || undefined,
      limit: 200,
    }),
    [user?._id, project, sprint, status, priority, search],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks', filters],
    queryFn: () => fetchTasks(filters),
    enabled: Boolean(user?._id),
  });

  const tasks: Task[] = data?.tasks ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-sm text-muted">Everything assigned to you, in one place.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-surface-border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.title}
              </option>
            ))}
          </select>
          <select
            value={sprint}
            onChange={(e) => setSprint(e.target.value)}
            disabled={!project}
            className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted"
          >
            <option value="">{project ? 'All sprints' : 'Pick project first'}</option>
            {sprints.map((s) => (
              <option key={s._id} value={s._id}>
                #{s.sprintNumber} {s.title}
              </option>
            ))}
          </select>
          <Input
            placeholder="Search title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pills options={statusTabs} value={status} onChange={(v) => setStatus(v as StatusTab)} />
            <Pills options={priorityTabs} value={priority} onChange={(v) => setPriority(v as PriorityTab)} />
          </div>

          <div className="flex rounded-lg border border-surface-border bg-white p-1">
            <button
              onClick={() => changeView('list')}
              className={cn(
                'rounded-md p-1.5',
                view === 'list' ? 'bg-primary-600 text-white' : 'text-muted hover:bg-surface-subtle',
              )}
              aria-label="List view"
            >
              <Table2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => changeView('kanban')}
              className={cn(
                'rounded-md p-1.5',
                view === 'kanban' ? 'bg-primary-600 text-white' : 'text-muted hover:bg-surface-subtle',
              )}
              aria-label="Kanban view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <CheckSquare className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Nothing on your plate</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            No tasks match these filters. Take a breath or check the global Tasks page.
          </p>
        </div>
      ) : view === 'list' ? (
        <TaskTable
          tasks={tasks}
          onRowClick={(task) => router.push(`/tasks?taskId=${task._id}`)}
        />
      ) : (
        <KanbanBoard
          tasks={tasks}
          onTaskClick={(task) => router.push(`/tasks?taskId=${task._id}`)}
          blockSelfApprove={!canSelfApprove}
        />
      )}
    </div>
  );
}

interface PillsProps<T extends string> {
  options: { value: T; label: string; dot?: string }[];
  value: T;
  onChange: (v: T) => void;
}

function Pills<T extends string>({ options, value, onChange }: PillsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-surface-border bg-white p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === opt.value ? 'bg-primary-600 text-white' : 'text-muted hover:bg-surface-subtle',
          )}
        >
          {opt.dot && <span className={cn('h-1.5 w-1.5 rounded-full', opt.dot)} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
