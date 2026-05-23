'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, X, Check } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, User } from '@/types';
import { taskSchema, type TaskValues } from '@/lib/validators';
import { createTask, updateTask, fetchUsers, type TaskInput } from '@/lib/tasks-api';
import { fetchProjects } from '@/lib/projects-api';
import { fetchSprints } from '@/lib/sprints-api';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');

const priorityOptions: { value: TaskPriority; label: string; dot: string }[] = [
  { value: 'low', label: 'Low', dot: 'bg-slate-400' },
  { value: 'medium', label: 'Medium', dot: 'bg-blue-500' },
  { value: 'high', label: 'High', dot: 'bg-amber-500' },
  { value: 'critical', label: 'Critical', dot: 'bg-red-500' },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  defaultProjectId?: string;
  defaultSprintId?: string;
  defaultStatus?: TaskStatus;
}

export function TaskFormModal({
  open,
  onClose,
  task,
  defaultProjectId,
  defaultSprintId,
  defaultStatus,
}: TaskFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(task);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      project: '',
      sprint: '',
      assignees: [],
      priority: 'medium',
      status: 'todo',
      estimate: '',
      tags: '',
      dueDate: '',
    },
  });

  const projectId = watch('project');

  // Reset whenever the modal (re)opens with new context.
  useEffect(() => {
    if (!open) return;
    reset({
      title: task?.title ?? '',
      description: task?.description ?? '',
      project: (task?.project as string) ?? defaultProjectId ?? '',
      sprint: (task?.sprint as string) ?? defaultSprintId ?? '',
      assignees: (task?.assignees as string[]) ?? [],
      priority: task?.priority ?? 'medium',
      status: task?.status ?? defaultStatus ?? 'todo',
      estimate: task?.estimate?.toString() ?? '',
      tags: task?.tags?.join(', ') ?? '',
      dueDate: toDateInput(task?.dueDate),
    });
  }, [open, task, defaultProjectId, defaultSprintId, defaultStatus, reset]);

  const { data: projectData } = useQuery({
    queryKey: ['projects', { limit: 100 }],
    queryFn: () => fetchProjects({ limit: 100 }),
    enabled: open,
  });
  const projects = projectData?.projects ?? [];

  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => fetchSprints(projectId),
    enabled: open && Boolean(projectId),
  });

  const projectOptions = useMemo(
    () => [
      { value: '', label: 'Select project…' },
      ...projects.map((p) => ({ value: p._id, label: p.title })),
    ],
    [projects],
  );

  const sprintOptions = useMemo(
    () => [
      { value: '', label: projectId ? 'Select sprint…' : 'Pick a project first' },
      ...sprints.map((s) => ({ value: s._id, label: `#${s.sprintNumber} ${s.title}` })),
    ],
    [sprints, projectId],
  );

  const mutation = useMutation({
    mutationFn: (values: TaskValues) => {
      const payload: TaskInput = {
        title: values.title,
        description: values.description || undefined,
        project: values.project,
        sprint: values.sprint,
        assignees: values.assignees ?? [],
        priority: values.priority,
        status: values.status,
        dueDate: values.dueDate || undefined,
        estimate: values.estimate ? Number(values.estimate) : undefined,
        tags: values.tags
          ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      };
      return isEdit ? updateTask(task!._id, payload) : createTask(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(isEdit ? 'Task updated' : 'Task created');
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit task' : 'New task'}
      size="2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((v) => mutation.mutate(v))}
            isLoading={mutation.isPending || isSubmitting}
          >
            {isEdit ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <Input
          label="Title"
          placeholder="What needs to get done?"
          error={errors.title?.message}
          {...register('title')}
        />

        <Textarea
          label="Description"
          rows={4}
          placeholder="Add detail, context, acceptance criteria…"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Project"
            options={projectOptions}
            error={errors.project?.message}
            {...register('project')}
          />
          <Select
            label="Sprint"
            options={sprintOptions}
            error={errors.sprint?.message}
            disabled={!projectId}
            {...register('sprint')}
          />
        </div>

        <Controller
          control={control}
          name="assignees"
          render={({ field }) => (
            <AssigneesPicker
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />

        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">Priority</span>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {priorityOptions.map((opt) => {
                  const active = field.value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-surface-border bg-white text-muted hover:bg-surface-subtle',
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', opt.dot)} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Status" options={statusOptions} {...register('status')} />
          <Input type="date" label="Due date" {...register('dueDate')} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Estimate</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                className={cn(
                  'h-10 w-full rounded-lg border bg-white pl-3 pr-12 text-sm text-foreground transition-colors',
                  'focus:outline-none focus:ring-2',
                  errors.estimate
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                    : 'border-surface-border focus:border-primary-400 focus:ring-primary-100',
                )}
                {...register('estimate')}
              />
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted">
                hrs
              </span>
            </div>
            {errors.estimate && (
              <p className="mt-1.5 text-xs text-red-600">{errors.estimate.message}</p>
            )}
          </div>
        </div>

        <Input
          label="Tags"
          placeholder="Comma-separated, e.g. backend, urgent"
          {...register('tags')}
        />
      </form>
    </Modal>
  );
}

interface AssigneesPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

function AssigneesPicker({ value, onChange }: AssigneesPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(query),
    enabled: open,
  });

  const { data: selectedUsers = [] } = useQuery({
    queryKey: ['users', 'selected', value],
    queryFn: async () => {
      if (value.length === 0) return [] as User[];
      const all = await fetchUsers();
      return all.filter((u) => value.includes(u._id));
    },
    enabled: value.length > 0,
  });

  // Close on click-outside and on Escape — standard combobox behaviour.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div ref={containerRef}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Assignees</span>
        {value.length > 0 && (
          <span className="text-xs text-muted">
            {value.length} selected
          </span>
        )}
      </div>

      {selectedUsers.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <span
              key={u._id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 py-0.5 pl-0.5 pr-1.5 text-xs font-medium text-primary-700"
            >
              <Avatar name={u.name} size="sm" className="h-5 w-5 text-[10px] ring-0" />
              {u.name}
              <button
                type="button"
                onClick={() => toggle(u._id)}
                className="rounded-full p-0.5 hover:bg-primary-100"
                aria-label={`Remove ${u.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          placeholder="Search users by name or email"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          leftIcon={<Search className="h-4 w-4" />}
        />

        {open && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-surface-border bg-white shadow-lg">
            {users.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted">No users found.</p>
            ) : (
              users.map((u) => {
                const selected = value.includes(u._id);
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => toggle(u._id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      selected ? 'bg-primary-50/60' : 'hover:bg-surface-subtle',
                    )}
                  >
                    <Avatar name={u.name} src={u.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{u.name}</p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                    {selected && <Check className="h-4 w-4 shrink-0 text-primary-600" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
