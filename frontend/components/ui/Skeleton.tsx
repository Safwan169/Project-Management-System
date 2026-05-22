import { cn } from '@/lib/utils';

// A pulsing gray block used as a loading placeholder.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} />;
}
