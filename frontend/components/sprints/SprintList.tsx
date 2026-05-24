'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { Plus, Layers } from 'lucide-react';
import type { Project, Sprint } from '@/types';
import { fetchSprints, deleteSprint } from '@/lib/sprints-api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SprintFormModal } from './SprintFormModal';
import { SprintReorderList } from './SprintReorderList';

interface SprintListProps {
  project: Project;
  canManage: boolean;
}

export function SprintList({ project, canManage }: SprintListProps) {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sprint | undefined>();
  const [deleting, setDeleting] = useState<Sprint | undefined>();

  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['sprints', project._id],
    queryFn: () => fetchSprints(project._id),
  });

  const deleteMutation = useMutation({
    mutationFn: (sprint: Sprint) => deleteSprint(project._id, sprint._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', project._id] });
      queryClient.invalidateQueries({ queryKey: ['project', project._id] });
      toast.success('Sprint deleted');
      setDeleting(undefined);
    },
    onError: (err) => {
      // 409 = sprint still has tasks; the interceptor already toasts the
      // backend message. Just close the dialog.
      if (err instanceof AxiosError && err.response?.status === 409) {
        setDeleting(undefined);
      }
    },
  });

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (sprint: Sprint) => {
    setEditing(sprint);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sprints.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border py-12 text-center">
          <Layers className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-foreground">No sprints yet</p>
          <p className="mt-1 text-xs text-muted">
            {canManage
              ? 'Add the first sprint to start planning work.'
              : 'Sprints will appear here once a manager creates them.'}
          </p>
        </div>
      ) : (
        <SprintReorderList
          project={project}
          sprints={sprints}
          canManage={canManage}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}

      {canManage && (
        <Button variant="outline" fullWidth onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Sprint
        </Button>
      )}

      <SprintFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        project={project}
        sprint={editing}
        nextSprintNumber={sprints.length + 1}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        title="Delete sprint"
        message={`Delete "${deleting?.title}"? Sprints with tasks cannot be deleted until their tasks are moved.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
