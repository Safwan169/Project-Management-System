'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { Sprint } from '@/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

// Sprint status -> badge color.
const statusColor = {
  upcoming: 'gray',
  active: 'indigo',
  completed: 'green',
} as const;

interface SprintCardProps {
  sprint: Sprint;
  canManage: boolean;
  onEdit: (sprint: Sprint) => void;
  onDelete: (sprint: Sprint) => void;
}

export function SprintCard({ sprint, canManage, onEdit, onDelete }: SprintCardProps) {
  const [expanded, setExpanded] = useState(false);

  const total = sprint.taskCount ?? 0;
  const done = sprint.completedTaskCount ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="group rounded-lg border border-surface-border bg-white">
      {/* Header — click to expand. */}
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

          {/* Task progress mini-bar. */}
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

      {/* Expanded body — task list lands here in the Tasks module. */}
      <div className={cn('border-t border-surface-border px-4 py-4', !expanded && 'hidden')}>
        {sprint.goal && (
          <p className="mb-3 text-xs text-muted">
            <span className="font-medium text-foreground">Goal:</span> {sprint.goal}
          </p>
        )}
        <p className="rounded-md bg-surface-subtle px-3 py-4 text-center text-xs text-muted">
          {total > 0
            ? `${total} task(s) in this sprint — the full task list arrives in the Tasks module.`
            : 'No tasks yet. The task board arrives in the Tasks module.'}
        </p>
      </div>
    </div>
  );
}
