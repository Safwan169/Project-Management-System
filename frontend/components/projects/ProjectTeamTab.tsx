'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserPlus, X } from 'lucide-react';
import type { Project, User } from '@/types';
import { removeProjectMember } from '@/lib/projects-api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AddMemberModal } from './AddMemberModal';

// On the detail endpoint members.user is populated; treat it as a User.
function asUser(value: Project['members'][number]['user']): User | null {
  return typeof value === 'string' ? null : (value as User);
}

interface ProjectTeamTabProps {
  project: Project;
  canManage: boolean;
}

export function ProjectTeamTab({ project, canManage }: ProjectTeamTabProps) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeProjectMember(project._id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project._id] });
      toast.success('Member removed');
      setRemoving(null);
    },
  });

  const memberIds = project.members
    .map((m) => asUser(m.user)?._id)
    .filter((id): id is string => Boolean(id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {project.members.length} member{project.members.length === 1 ? '' : 's'}
        </h3>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {project.members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-surface-border py-8 text-center text-sm text-muted">
          No members on this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-surface-border rounded-lg border border-surface-border">
          {project.members.map((member) => {
            const user = asUser(member.user);
            if (!user) return null;
            return (
              <li key={user._id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={user.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <Badge role={member.role}>{member.role}</Badge>
                {canManage && (
                  <button
                    onClick={() => setRemoving({ id: user._id, name: user.name })}
                    className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${user.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        projectId={project._id}
        existingMemberIds={memberIds}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeMutation.mutate(removing.id)}
        title="Remove member"
        message={`Remove ${removing?.name} from this project?`}
        confirmLabel="Remove"
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
