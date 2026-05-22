import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

interface CardProps {
  children: ReactNode;
  /** Optional header — rendered above the body with a divider. */
  header?: ReactNode;
  padding?: keyof typeof paddings;
  className?: string;
}

export function Card({ children, header, padding = 'md', className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-surface-border bg-surface shadow-card',
        className,
      )}
    >
      {header && (
        <div className="border-b border-surface-border px-6 py-4 text-sm font-semibold text-foreground">
          {header}
        </div>
      )}
      <div className={paddings[padding]}>{children}</div>
    </div>
  );
}
