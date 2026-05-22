interface ProgressBarProps {
  /** 0–100. Clamped defensively. */
  value: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ value, showLabel = true, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={className}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-primary-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <p className="mt-1 text-xs text-muted">{pct}% complete</p>}
    </div>
  );
}
