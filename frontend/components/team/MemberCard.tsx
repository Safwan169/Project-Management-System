'use client';

import { Pencil, UserX } from 'lucide-react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

interface MemberCardProps {
  user: User;
  canEdit: boolean;
  canDeactivate: boolean;
  onOpen: (user: User) => void;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}

export function MemberCard({
  user,
  canEdit,
  canDeactivate,
  onOpen,
  onEdit,
  onDeactivate,
}: MemberCardProps) {
  const skills = user.skills ?? [];
  const overflow = skills.length - 3;

  return (
    <div
      onClick={() => onOpen(user)}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-surface-border bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-md',
        !user.isActive && 'opacity-60',
      )}
    >
      {!user.isActive && (
        <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
          Inactive
        </span>
      )}

      <div className="flex items-start gap-3">
        <Avatar name={user.name} src={user.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{user.name}</h3>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge role={user.role}>{user.role}</Badge>
            {user.department && (
              <span className="text-xs text-muted">· {user.department}</span>
            )}
          </div>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-muted"
            >
              {skill}
            </span>
          ))}
          {overflow > 0 && (
            <span className="rounded bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-muted">
              +{overflow}
            </span>
          )}
        </div>
      )}

      {(canEdit || canDeactivate) && (
        <div className="mt-1 flex gap-2 border-t border-surface-border pt-3 opacity-0 transition-opacity group-hover:opacity-100">
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(user);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          {canDeactivate && user.isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeactivate(user);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-red-50 hover:text-red-600"
            >
              <UserX className="h-3.5 w-3.5" />
              Deactivate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
