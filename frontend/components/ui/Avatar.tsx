import { cn } from '@/lib/utils';

const sizes = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}

// Initials-only avatar — the backend stores avatars as filenames but we
// don't have an avatar upload flow yet, so initials are the fallback.
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 ring-2 ring-white',
        sizes[size],
        className,
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}

interface AvatarStackProps {
  names: string[];
  max?: number;
  size?: keyof typeof sizes;
}

// Overlapping avatars with a "+N" overflow chip.
export function AvatarStack({ names, max = 4, size = 'sm' }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white',
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
