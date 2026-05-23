'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, User, Project, Sprint } from '@/types';
import { updateTask } from '@/lib/tasks-api';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { AvatarStack } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

type SortKey = 'title' | 'priority' | 'status' | 'dueDate' | 'estimate';

const priorityRank: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const statusRank: Record<TaskStatus, number> = {
  todo: 0,
  inprogress: 1,
  review: 2,
  done: 3,
};

const priorityBadge: Record<TaskPriority, 'gray' | 'blue' | 'amber' | 'red'> = {
  low: 'gray',
  medium: 'blue',
  high: 'amber',
  critical: 'red',
};

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

interface TaskTableProps {
  tasks: Task[];
  onRowClick: (task: Task) => void;
  canBulkEdit?: boolean;
}

export function TaskTable({ tasks, onRowClick, canBulkEdit = false }: TaskTableProps) {
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenu, setBulkMenu] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'priority':
          cmp = priorityRank[a.priority] - priorityRank[b.priority];
          break;
        case 'status':
          cmp = statusRank[a.status] - statusRank[b.status];
          break;
        case 'dueDate':
          cmp = (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
          break;
        case 'estimate':
          cmp = (a.estimate ?? 0) - (b.estimate ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [tasks, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allSelected = sorted.length > 0 && sorted.every((t) => selected.has(t._id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((t) => t._id)));
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const bulkStatusMutation = useMutation({
    mutationFn: async (status: TaskStatus) => {
      await Promise.all(
        Array.from(selected).map((id) => updateTask(id, { status })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Updated ${selected.size} task(s)`);
      setSelected(new Set());
      setBulkMenu(false);
    },
  });

  return (
    <div className="space-y-3">
      {canBulkEdit && selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5">
          <span className="text-sm font-medium text-primary-700">
            {selected.size} selected
          </span>
          <div className="relative">
            <Button size="sm" variant="secondary" onClick={() => setBulkMenu((v) => !v)}>
              Change status <ChevronDown className="h-4 w-4" />
            </Button>
            {bulkMenu && (
              <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-surface-border bg-white shadow-lg">
                {(Object.keys(statusLabel) as TaskStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => bulkStatusMutation.mutate(s)}
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-subtle"
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border bg-surface-subtle text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                {canBulkEdit && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-surface-border text-primary-600 focus:ring-primary-400"
                    />
                  </th>
                )}
                <SortHeader label="Title" k="title" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Sprint</th>
                <th className="px-4 py-3 font-medium">Assignees</th>
                <SortHeader label="Priority" k="priority" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Due" k="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader
                  label="Estimate"
                  k="estimate"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={canBulkEdit ? 9 : 8}
                    className="px-4 py-12 text-center text-sm text-muted"
                  >
                    No tasks match the current filters.
                  </td>
                </tr>
              ) : (
                sorted.map((task) => {
                  const overdue =
                    task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
                  const assignees = (task.assignees as User[]).filter(
                    (a) => a && typeof a === 'object',
                  );
                  return (
                    <tr
                      key={task._id}
                      onClick={() => onRowClick(task)}
                      className="cursor-pointer transition-colors hover:bg-surface-subtle"
                    >
                      {canBulkEdit && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(task._id)}
                            onChange={() => toggleOne(task._id)}
                            className="h-4 w-4 rounded border-surface-border text-primary-600 focus:ring-primary-400"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{task.title}</p>
                        {task.tags && task.tags.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted">{task.tags.join(' · ')}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {projectLabel(task.project)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {sprintLabel(task.sprint)}
                      </td>
                      <td className="px-4 py-3">
                        {assignees.length > 0 ? (
                          <AvatarStack names={assignees.map((a) => a.name)} max={3} />
                        ) : (
                          <span className="text-xs text-muted">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={priorityBadge[task.priority]}>{task.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={task.status}>{statusLabel[task.status]}</Badge>
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-sm',
                          overdue ? 'font-medium text-red-600' : 'text-muted',
                        )}
                      >
                        {formatDate(task.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {task.estimate ? `${task.estimate}h` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function projectLabel(project: Task['project']): string {
  if (typeof project === 'string') return '—';
  return (project as Project).title;
}

function sprintLabel(sprint: Task['sprint']): string {
  if (typeof sprint === 'string') return '—';
  const s = sprint as Sprint;
  return `#${s.sprintNumber}`;
}

interface SortHeaderProps {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}

function SortHeader({ label, k, sortKey, sortDir, onSort }: SortHeaderProps) {
  const active = sortKey === k;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        onClick={() => onSort(k)}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
        <ArrowUpDown
          className={cn('h-3 w-3', active && sortDir === 'desc' && 'rotate-180')}
        />
      </button>
    </th>
  );
}
