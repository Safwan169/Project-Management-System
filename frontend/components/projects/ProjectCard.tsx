'use client';

import { useRouter } from 'next/navigation';
import { Calendar, AlertTriangle, Pencil, Trash2, ImageIcon } from 'lucide-react';
import type { Project, User } from '@/types';
import { thumbnailUrl } from '@/lib/media';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/store/authStore';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AvatarStack } from '@/components/ui/Avatar';

// A member's user field may be a populated User or just an id string.
function memberName(user: Project['members'][number]['user']): string {
  return typeof user === 'string' ? '' : (user as User).name;
}

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const totalTasks = project.totalTasks ?? 0;
  const completedTasks = project.completedTasks ?? 0;
  const progressPercent =
    project.progressPercent ??
    (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

  const thumb = thumbnailUrl(project.thumbnail);
  const memberNames = project.members.map((m) => memberName(m.user)).filter(Boolean);

  return (
    <div
      onClick={() => router.push(`/projects/${project._id}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-card transition-shadow hover:shadow-md"
    >
      {/* Thumbnail (or placeholder). */}
      <div className="relative h-32 bg-slate-100">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={project.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}

        {/* Edit/Delete — visible on hover, admin/manager only. */}
        {canManage && (
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              className="rounded-md bg-white/90 p-1.5 text-muted shadow-sm hover:text-foreground"
              aria-label="Edit project"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project);
              }}
              className="rounded-md bg-white/90 p-1.5 text-muted shadow-sm hover:text-red-600"
              aria-label="Delete project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{project.title}</h3>
            <p className="truncate text-sm text-muted">{project.client}</p>
          </div>
          <Badge status={project.status}>{project.status}</Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {completedTasks}/{totalTasks} tasks
            </span>
            <span>{progressPercent}%</span>
          </div>
          <ProgressBar value={progressPercent} />
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span
            className={`flex items-center gap-1 text-xs ${
              project.isOverdue ? 'font-medium text-red-600' : 'text-muted'
            }`}
          >
            {project.isOverdue ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <Calendar className="h-3.5 w-3.5" />
            )}
            {formatDate(project.endDate)}
          </span>
          {memberNames.length > 0 && <AvatarStack names={memberNames} />}
        </div>
      </div>
    </div>
  );
}
