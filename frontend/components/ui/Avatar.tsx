import { cn } from '@/lib/utils';
import { avatarUrl } from '@/lib/media';

const sizes = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
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
  src?: string;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const url = avatarUrl(src);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        title={name}
        className={cn(
          'inline-block shrink-0 rounded-full bg-slate-100 object-cover ring-2 ring-white',
          sizes[size],
          className,
        )}
      />
    );
  }
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
