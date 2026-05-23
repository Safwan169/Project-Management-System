'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import type { Sprint, Project } from '@/types';
import { sprintSchema, type SprintValues } from '@/lib/validators';
import { createSprint, updateSprint, type SprintInput } from '@/lib/sprints-api';
import { formatDate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');

interface SprintFormModalProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  /** Pass a sprint to edit; omit to create. */
  sprint?: Sprint;
  /** Number shown for a new sprint (existing count + 1). */
  nextSprintNumber: number;
}

export function SprintFormModal({
  open,
  onClose,
  project,
  sprint,
  nextSprintNumber,
}: SprintFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(sprint);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SprintValues>({
    resolver: zodResolver(sprintSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      title: sprint?.title ?? '',
      goal: sprint?.goal ?? '',
      startDate: toDateInput(sprint?.startDate),
      endDate: toDateInput(sprint?.endDate),
    });
  }, [open, sprint, reset]);

  // Soft check: warn (don't block) when the sprint falls outside the
  // project's own date range.
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const outsideProjectRange =
    (startDate && startDate < project.startDate.slice(0, 10)) ||
    (endDate && endDate > project.endDate.slice(0, 10));

  const mutation = useMutation({
    mutationFn: (values: SprintValues) => {
      const payload: SprintInput = {
        title: values.title,
        goal: values.goal || undefined,
        startDate: values.startDate,
        endDate: values.endDate,
      };
      return isEdit
        ? updateSprint(project._id, sprint!._id, payload)
        : createSprint(project._id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', project._id] });
      queryClient.invalidateQueries({ queryKey: ['project', project._id] });
      toast.success(isEdit ? 'Sprint updated' : 'Sprint created');
      onClose();
    },
  });

  const sprintNo = sprint?.sprintNumber ?? nextSprintNumber;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit sprint' : 'New sprint'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((v) => mutation.mutate(v))}
            isLoading={mutation.isPending || isSubmitting}
          >
            {isEdit ? 'Save changes' : 'Create sprint'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        {/* sprintNumber is server-assigned — shown read-only. */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">Sprint number</span>
          <span className="inline-flex items-center rounded-md bg-surface-subtle px-3 py-1.5 text-sm font-medium text-muted">
            Sprint #{sprintNo}
          </span>
        </div>

        <Input label="Title" error={errors.title?.message} {...register('title')} />
        <Textarea
          label="Goal"
          rows={2}
          placeholder="What should this sprint achieve?"
          error={errors.goal?.message}
          {...register('goal')}
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

        {outsideProjectRange && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              These dates fall outside the project range ({formatDate(project.startDate)} –{' '}
              {formatDate(project.endDate)}). You can still save.
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
}
