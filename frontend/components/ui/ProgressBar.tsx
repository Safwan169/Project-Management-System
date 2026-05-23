import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

// Linear bar with optional label/percentage.
export function ProgressBar({ value, showLabel = true, label, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={className}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-primary-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-muted">
          {label ? `${label} · ${pct}%` : `${pct}% complete`}
        </p>
      )}
    </div>
  );
}

// Breakdown bar that paints task counts per status as colored segments.
interface SegmentedProgressProps {
  todo: number;
  inprogress: number;
  review: number;
  done: number;
  className?: string;
}

export function SegmentedProgress({
  todo,
  inprogress,
  review,
  done,
  className,
}: SegmentedProgressProps) {
  const total = todo + inprogress + review + done;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
        {done > 0 && (
          <div className="h-full bg-emerald-500" style={{ width: `${pct(done)}%` }} />
        )}
        {review > 0 && (
          <div className="h-full bg-amber-500" style={{ width: `${pct(review)}%` }} />
        )}
        {inprogress > 0 && (
          <div className="h-full bg-blue-500" style={{ width: `${pct(inprogress)}%` }} />
        )}
        {todo > 0 && (
          <div className="h-full bg-slate-400" style={{ width: `${pct(todo)}%` }} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <LegendDot color="bg-slate-400" label="To Do" count={todo} />
        <LegendDot color="bg-blue-500" label="In Progress" count={inprogress} />
        <LegendDot color="bg-amber-500" label="Review" count={review} />
        <LegendDot color="bg-emerald-500" label="Done" count={done} />
      </div>
    </div>
  );
}

function LegendDot({ color, label, count }: { color: string; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
      {label} <span className="font-medium text-foreground">{count}</span>
    </span>
  );
}
