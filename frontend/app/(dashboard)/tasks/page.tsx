'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, LayoutGrid, Table2, CheckSquare } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { fetchTasks, fetchUsers } from '@/lib/tasks-api';
import { fetchProjects } from '@/lib/projects-api';
import { fetchSprints } from '@/lib/sprints-api';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { TaskTable } from '@/components/tasks/TaskTable';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';

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

const VIEW_KEY = 'pms.tasksView';

export default function TasksPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [project, setProject] = useState('');
  const [sprint, setSprint] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState<StatusTab>('all');
  const [priority, setPriority] = useState<PriorityTab>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');

  const [formOpen, setFormOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<{ status?: TaskStatus }>({});

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === 'list' || saved === 'kanban') setView(saved);
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  };

  // Reset the sprint filter whenever the project changes.
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

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
  });

  const filters = useMemo(
    () => ({
      project: project || undefined,
      sprint: sprint || undefined,
      assignee: assignee || undefined,
      status: status === 'all' ? undefined : status,
      priority: priority === 'all' ? undefined : priority,
      search: search.trim() || undefined,
      limit: 200,
    }),
    [project, sprint, assignee, status, priority, search],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
  });

  const tasks: Task[] = data?.tasks ?? [];

  const canCreate = canManage || (user && projects.some((p) =>
    p.members.some((m) => {
      const memberId = typeof m.user === 'string' ? m.user : m.user._id;
      return memberId === user._id;
    }),
  ));

  const openCreate = (status?: TaskStatus) => {
    setFormDefaults({ status });
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted">All tasks across the projects you can see.</p>
        </div>
        {canCreate && (
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-surface-border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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

          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="">All assignees</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
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
            <Pills
              options={statusTabs}
              value={status}
              onChange={(v) => setStatus(v as StatusTab)}
            />
            <Pills
              options={priorityTabs}
              value={priority}
              onChange={(v) => setPriority(v as PriorityTab)}
            />
          </div>

          <div className="flex rounded-lg border border-surface-border bg-white p-1">
            <button
              onClick={() => changeView('list')}
              className={cn(
                'rounded-md p-1.5',
                view === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-muted hover:bg-surface-subtle',
              )}
              aria-label="List view"
            >
              <Table2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => changeView('kanban')}
              className={cn(
                'rounded-md p-1.5',
                view === 'kanban'
                  ? 'bg-primary-600 text-white'
                  : 'text-muted hover:bg-surface-subtle',
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
          <h3 className="text-lg font-semibold text-foreground">No tasks found</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Try adjusting the filters, or create a new task to get started.
          </p>
          {canCreate && (
            <Button className="mt-4" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      ) : view === 'list' ? (
        <TaskTable
          tasks={tasks}
          onRowClick={() => {
            /* Detail modal lands in phase 2. */
          }}
          canBulkEdit={canManage}
        />
      ) : (
        <KanbanBoard
          tasks={tasks}
          onTaskClick={() => {
            /* Detail modal lands in phase 2. */
          }}
          onAddInColumn={canCreate ? openCreate : undefined}
        />
      )}

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaultProjectId={project || undefined}
        defaultSprintId={sprint || undefined}
        defaultStatus={formDefaults.status}
      />
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
            value === opt.value
              ? 'bg-primary-600 text-white'
              : 'text-muted hover:bg-surface-subtle',
          )}
        >
          {opt.dot && <span className={cn('h-1.5 w-1.5 rounded-full', opt.dot)} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
