'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

// Placeholder sprints — the sprint/task API and full UI land in a later
// module. This renders the collapsible shell so the tab is navigable now.
interface CollapsibleSprintProps {
  index: number;
}

function CollapsibleSprint({ index }: CollapsibleSprintProps) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="rounded-lg border border-surface-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted" />
        )}
        <span className="text-sm font-medium text-foreground">Sprint #{index + 1}</span>
      </button>
      <div className={cn('px-4 pb-4', !open && 'hidden')}>
        <p className="rounded-md bg-surface-subtle px-3 py-4 text-center text-xs text-muted">
          Task list preview — the full sprint board arrives in the Sprints module.
        </p>
      </div>
    </div>
  );
}

export function ProjectSprintsTab({ sprintCount }: { sprintCount: number }) {
  if (sprintCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border py-12 text-center">
        <Layers className="mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-foreground">No sprints yet</p>
        <p className="mt-1 text-xs text-muted">
          Sprints and tasks will appear here once the Sprints module is built.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: sprintCount }).map((_, i) => (
        <CollapsibleSprint key={i} index={i} />
      ))}
    </div>
  );
}
