'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImageIcon, Upload } from 'lucide-react';
import type { Project } from '@/types';
import { projectSchema, type ProjectValues } from '@/lib/validators';
import {
  createProject,
  updateProject,
  uploadProjectThumbnail,
  type ProjectInput,
} from '@/lib/projects-api';
import { thumbnailUrl } from '@/lib/media';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

// date inputs need yyyy-MM-dd; trim an ISO string down to that.
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Pass a project to edit; omit to create. */
  project?: Project;
}

export function ProjectFormModal({ open, onClose, project }: ProjectFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(project);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected (not yet uploaded) thumbnail file + its preview URL.
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
  });

  // Reset the form whenever the modal opens or the target project changes.
  useEffect(() => {
    if (!open) return;
    reset({
      title: project?.title ?? '',
      client: project?.client ?? '',
      description: project?.description ?? '',
      startDate: toDateInput(project?.startDate),
      endDate: toDateInput(project?.endDate),
      budget: project?.budget !== undefined ? String(project.budget) : '',
      status: project?.status ?? 'planned',
    });
    setThumbFile(null);
    setPreviewUrl(null);
  }, [open, project, reset]);

  // Revoke the object URL when the preview changes / unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const mutation = useMutation({
    mutationFn: async (values: ProjectValues) => {
      const payload: ProjectInput = {
        title: values.title,
        client: values.client,
        description: values.description || undefined,
        startDate: values.startDate,
        endDate: values.endDate,
        budget: values.budget ? Number(values.budget) : undefined,
        status: values.status,
      };

      const saved = isEdit
        ? await updateProject(project!._id, payload)
        : await createProject(payload);

      // Thumbnail is a separate multipart request once we have an id.
      if (thumbFile) {
        await uploadProjectThumbnail(saved._id, thumbFile);
      }
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (project) {
        queryClient.invalidateQueries({ queryKey: ['project', project._id] });
      }
      toast.success(isEdit ? 'Project updated' : 'Project created');
      onClose();
    },
    // Errors are toasted by the axios interceptor.
  });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Preview precedence: newly picked file, then the existing thumbnail.
  const shownThumb = previewUrl ?? thumbnailUrl(project?.thumbnail);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit project' : 'New project'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((v) => mutation.mutate(v))}
            isLoading={mutation.isPending || isSubmitting}
          >
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <Input label="Title" error={errors.title?.message} {...register('title')} />
        <Input label="Client" error={errors.client?.message} {...register('client')} />
        <Textarea
          label="Description"
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="date"
            label="Start date"
            error={errors.startDate?.message}
            {...register('startDate')}
          />
          <Input
            type="date"
            label="End date"
            error={errors.endDate?.message}
            {...register('endDate')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Budget</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                min={0}
                step={1}
                className="h-10 w-full rounded-lg border border-surface-border bg-white pl-7 pr-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                {...register('budget')}
              />
            </div>
            {errors.budget?.message && (
              <p className="mt-1.5 text-xs text-red-600">{errors.budget.message}</p>
            )}
          </div>
          <Select label="Status" options={statusOptions} {...register('status')} />
        </div>

        {/* Thumbnail picker with live preview. */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Thumbnail</label>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-surface-border bg-slate-100">
              {shownThumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownThumb} alt="Thumbnail preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {thumbFile ? 'Change image' : 'Upload image'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
