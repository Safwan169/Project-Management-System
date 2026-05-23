'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';
import type { User, UserRole } from '@/types';
import {
  memberCreateSchema,
  memberEditSchema,
  type MemberCreateValues,
  type MemberEditValues,
} from '@/lib/validators';
import { registerRequest } from '@/lib/auth-api';
import { updateUserProfile, uploadUserAvatar } from '@/lib/users-api';
import { useAuth } from '@/store/authStore';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

interface MemberFormModalProps {
  open: boolean;
  onClose: () => void;
  member?: User;
}

export function MemberFormModal({ open, onClose, member }: MemberFormModalProps) {
  const isEdit = Boolean(member);
  return isEdit ? (
    <EditForm open={open} onClose={onClose} member={member!} />
  ) : (
    <CreateForm open={open} onClose={onClose} />
  );
}

function roleOptions(currentUserRole?: UserRole) {
  // Manager can only create members; admin can pick any role.
  if (currentUserRole === 'admin') {
    return [
      { value: 'member', label: 'Member' },
      { value: 'manager', label: 'Manager' },
      { value: 'admin', label: 'Admin' },
    ];
  }
  return [{ value: 'member', label: 'Member' }];
}

function CreateForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberCreateValues>({
    resolver: zodResolver(memberCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'member',
      department: '',
      skills: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'member',
        department: '',
        skills: '',
      });
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: MemberCreateValues) =>
      registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        department: values.department || undefined,
        skills: values.skills
          ? values.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success('Member created');
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New team member"
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
            Create member
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <Input label="Full name" error={errors.name?.message} {...register('name')} />
        <Input
          type="email"
          label="Email"
          autoComplete="off"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="password"
            label="Password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Role"
            options={roleOptions(currentUser?.role)}
            error={errors.role?.message}
            {...register('role')}
          />
          <Input
            label="Department"
            placeholder="e.g. Engineering"
            error={errors.department?.message}
            {...register('department')}
          />
        </div>

        <Input
          label="Skills"
          placeholder="Comma-separated, e.g. React, Node, Postgres"
          error={errors.skills?.message}
          {...register('skills')}
        />
      </form>
    </Modal>
  );
}

function EditForm({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: User;
}) {
  const queryClient = useQueryClient();
  const { user: currentUser, setUser } = useAuth();
  const isSelf = currentUser?._id === member._id;
  const isAdmin = currentUser?.role === 'admin';
  // Members can only edit their own basic profile.
  const canEditPrivileged = isAdmin;

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberEditValues>({
    resolver: zodResolver(memberEditSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: member.name,
      email: member.email,
      role: member.role,
      department: member.department ?? '',
      skills: member.skills?.join(', ') ?? '',
      isActive: member.isActive,
    });
  }, [open, member, reset]);

  const mutation = useMutation({
    mutationFn: (values: MemberEditValues) => {
      const payload: Record<string, unknown> = {
        name: values.name,
        department: values.department || undefined,
        skills: values.skills
          ? values.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      if (canEditPrivileged) {
        payload.email = values.email;
        payload.role = values.role;
        payload.isActive = values.isActive;
      }
      return updateUserProfile(member._id, payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      queryClient.invalidateQueries({ queryKey: ['user', member._id] });
      if (isSelf) setUser(updated);
      toast.success('Profile updated');
      onClose();
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadUserAvatar(member._id, file),
    onMutate: () => setUploading(true),
    onSettled: () => setUploading(false),
    onSuccess: (filename) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      queryClient.invalidateQueries({ queryKey: ['user', member._id] });
      if (isSelf && currentUser) setUser({ ...currentUser, avatar: filename });
      toast.success('Avatar updated');
    },
  });

  const onPickFile = () => fileRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
    e.target.value = '';
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit member"
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
            Save changes
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <div className="flex items-center gap-4">
          <Avatar name={member.name} src={member.avatar} size="xl" />
          <div>
            <Button type="button" variant="outline" size="sm" onClick={onPickFile} isLoading={uploading}>
              <Camera className="h-4 w-4" />
              Change photo
            </Button>
            <p className="mt-1 text-xs text-muted">JPG, PNG, or WebP up to 2MB.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </div>
        </div>

        <Input label="Full name" error={errors.name?.message} {...register('name')} />
        <Input
          type="email"
          label="Email"
          disabled={!canEditPrivileged}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Role"
            disabled={!canEditPrivileged}
            options={roleOptions(currentUser?.role)}
            error={errors.role?.message}
            {...register('role')}
          />
          <Input
            label="Department"
            placeholder="e.g. Engineering"
            error={errors.department?.message}
            {...register('department')}
          />
        </div>

        <Input
          label="Skills"
          placeholder="Comma-separated, e.g. React, Node, Postgres"
          error={errors.skills?.message}
          {...register('skills')}
        />

        {canEditPrivileged && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-surface-border text-primary-600 focus:ring-primary-400"
              {...register('isActive')}
            />
            Active
          </label>
        )}
      </form>
    </Modal>
  );
}
