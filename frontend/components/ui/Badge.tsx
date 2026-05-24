import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeColor = 'gray' | 'indigo' | 'green' | 'amber' | 'red' | 'blue';

const colors: Record<BadgeColor, string> = {
  gray: 'bg-slate-100 text-slate-700',
  indigo: 'bg-primary-50 text-primary-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
};

// Maps the backend's role enum to a color so role badges stay consistent.
const roleColors: Record<string, BadgeColor> = {
  admin: 'red',
  manager: 'indigo',
  member: 'gray',
};

// Maps the project/task status enums to a color.
const statusColors: Record<string, BadgeColor> = {
  planning: 'gray',
  active: 'green',
  in_progress: 'blue',
  in_review: 'amber',
  inprogress: 'blue',
  review: 'amber',
  on_hold: 'amber',
  todo: 'gray',
  done: 'green',
  completed: 'green',
  archived: 'gray',
};

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  /** Pick the color from a role enum value. */
  role?: string;
  /** Pick the color from a status enum value. */
  status?: string;
  className?: string;
}

export function Badge({ children, color, role, status, className }: BadgeProps) {
  const resolved =
    color ??
    (role ? roleColors[role] : undefined) ??
    (status ? statusColors[status] : undefined) ??
    'gray';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        colors[resolved],
        className,
      )}
    >
      {children}
    </span>
  );
}
