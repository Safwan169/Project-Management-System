'use client';

import { useState } from 'react';
import { useTaskDetail } from '@/components/tasks/TaskDetailContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { Sprint, Task, TaskStatus, User } from '@/types';
import { fetchTasks, updateTask, patchTaskInCaches, invalidateTaskCaches } from '@/lib/tasks-api';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/store/authStore';
import {
  resolveStatusUpdate,
  statusOptionsForRole,
  wasBlockedDoneAttempt,
} from '@/lib/task-status';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

const statusColor = {
  upcoming: 'gray',
  active: 'indigo',
  completed: 'green',
} as const;


const priorityBadge: Record<string, 'gray' | 'blue' | 'amber' | 'red'> = {
  low: 'gray',
  medium: 'blue',
  high: 'amber',
  critical: 'red',
};

interface SprintCardProps {
  sprint: Sprint;
  canManage: boolean;
  onEdit: (sprint: Sprint) => void;
  onDelete: (sprint: Sprint) => void;
}

export function SprintCard({ sprint, canManage, onEdit, onDelete }: SprintCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(canManage);
  const { openTask } = useTaskDetail();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const total = sprint.taskCount ?? 0;
  const done = sprint.completedTaskCount ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { sprint: sprint._id, limit: 200 }],
    queryFn: () => fetchTasks({ sprint: sprint._id, limit: 200 }),
    enabled: expanded,
  });
  const tasks = data?.tasks ?? [];

  const visibleTasks = showAll
    ? tasks
    : tasks.filter((t) =>
        (t.assignees as User[]).some(
          (a) => (typeof a === 'string' ? a : a._id) === user?._id,
        ),
      );

  const statusMutation = useMutation({
    mutationFn: ({ id, requested }: { id: string; requested: TaskStatus }) => {
      const status = resolveStatusUpdate(requested, user?.role);
      return updateTask(id, { status }).then((updated) => ({ updated, requested, status }));
    },
    onSuccess: ({ updated, requested, status }) => {
      patchTaskInCaches(queryClient, updated);
      if (
        wasBlockedDoneAttempt(requested, status, user?.role) ||
        (requested === 'done' && updated.status === 'review')
      ) {
        toast('Sent to review — a manager must approve "done".');
      } else {
        toast.success('Task updated');
      }
      invalidateTaskCaches(queryClient, updated._id);
    },
  });

  return (
    <div className="group rounded-lg border border-surface-border bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          )}

          <span className="shrink-0 text-xs font-semibold text-muted">
            Sprint #{sprint.sprintNumber}
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {sprint.title}
          </span>

          <span className="hidden shrink-0 text-xs text-muted sm:inline">
            {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
          </span>

          <Badge color={statusColor[sprint.status]} className="shrink-0">
            {sprint.status}
          </Badge>

          <span className="ml-auto hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
              <span
                className="block h-full rounded-full bg-primary-600"
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="text-xs text-muted">
              {done}/{total}
            </span>
          </span>
        </button>

        {canManage && (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onEdit(sprint)}
              className="rounded-md p-1.5 text-muted hover:bg-surface-subtle hover:text-foreground"
              aria-label="Edit sprint"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(sprint)}
              className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
              aria-label="Delete sprint"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className={cn('border-t border-surface-border px-4 py-4', !expanded && 'hidden')}>
        {sprint.goal && (
          <p className="mb-3 text-xs text-muted">
            <span className="font-medium text-foreground">Goal:</span> {sprint.goal}
          </p>
        )}

        {!canManage && (
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted">
              {showAll ? 'All tasks in this sprint' : 'Tasks assigned to you'}
            </p>
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              {showAll ? 'Show my tasks only' : 'Show all tasks'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size="sm" className="text-primary-600" />
          </div>
        ) : visibleTasks.length === 0 ? (
          <p className="rounded-md bg-surface-subtle px-3 py-4 text-center text-xs text-muted">
            {tasks.length === 0
              ? 'No tasks in this sprint yet.'
              : 'No tasks assigned to you in this sprint.'}
          </p>
        ) : (
          <ul className="divide-y divide-surface-border rounded-md border border-surface-border">
            {visibleTasks.map((task) => (
              <SprintTaskRow
                key={task._id}
                task={task}
                currentUserId={user?._id}
                canManage={canManage}
                onOpen={() => openTask(task._id)}
                onChangeStatus={(requested) =>
                  statusMutation.mutate({ id: task._id, requested })
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SprintTaskRowProps {
  task: Task;
  currentUserId?: string;
  canManage: boolean;
  onOpen: () => void;
  onChangeStatus: (status: TaskStatus) => void;
}

function SprintTaskRow({
  task,
  currentUserId,
  canManage,
  onOpen,
  onChangeStatus,
}: SprintTaskRowProps) {
  const { user } = useAuth();
  const statusOptions = statusOptionsForRole(user?.role);
  const isMine = (task.assignees as User[]).some(
    (a) => (typeof a === 'string' ? a : a._id) === currentUserId,
  );
  const canChangeStatus = canManage || isMine;
  const overdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();

  return (
    <li
      className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-subtle"
      onClick={onOpen}
      role="button"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {task.title}
      </span>

      <Badge color={priorityBadge[task.priority] ?? 'gray'}>{task.priority}</Badge>

      <span
        className={cn(
          'hidden shrink-0 text-xs sm:inline',
          overdue ? 'font-medium text-red-600' : 'text-muted',
        )}
      >
        {task.dueDate ? formatDate(task.dueDate) : '—'}
      </span>

      {canChangeStatus && task.status === 'done' && user?.role === 'member' ? (
        <Badge status="done">Done</Badge>
      ) : (
        <select
          value={task.status}
          disabled={!canChangeStatus}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChangeStatus(e.target.value as TaskStatus)}
          className="h-7 shrink-0 rounded-md border border-surface-border bg-white px-2 text-xs text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted"
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}
    </li>
  );
}
