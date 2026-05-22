'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Project } from '@/types';
import { deleteProject } from '@/lib/projects-api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProjectFormModal } from './ProjectFormModal';

interface ProjectSettingsTabProps {
  project: Project;
  /** True only for an admin — controls the delete danger zone. */
  canDelete: boolean;
}

export function ProjectSettingsTab({ project, canDelete }: ProjectSettingsTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(project._id),
    onSuccess: (warning) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(warning ?? 'Project deleted');
      router.replace('/projects');
    },
  });

  return (
    <div className="space-y-6">
      <Card header="Project details">
        <p className="mb-4 text-sm text-muted">
          Update the project&apos;s information, dates, budget, or thumbnail.
        </p>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          Edit project
        </Button>
      </Card>

      {canDelete && (
        <Card className="border-red-200" header={<span className="text-red-600">Danger zone</span>}>
          <p className="mb-4 text-sm text-muted">
            Deleting a project is permanent and cannot be undone.
          </p>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete this project
          </Button>
        </Card>
      )}

      <ProjectFormModal open={editOpen} onClose={() => setEditOpen(false)} project={project} />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete project"
        message={`Delete "${project.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
