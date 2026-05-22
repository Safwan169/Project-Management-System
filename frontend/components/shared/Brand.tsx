import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandProps {
  /** Show the tagline under the name — used on auth screens. */
  withTagline?: boolean;
  className?: string;
}

export function Brand({ withTagline = false, className }: BrandProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Layers className="h-5 w-5" />
        </span>
        <span className="text-2xl font-bold tracking-tight text-foreground">PMS</span>
      </div>
      {withTagline && (
        <p className="mt-2 text-sm text-muted">Plan projects, run sprints, ship work.</p>
      )}
    </div>
  );
}
