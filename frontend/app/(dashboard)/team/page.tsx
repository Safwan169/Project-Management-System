'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Users } from 'lucide-react';
import type { User, UserRole } from '@/types';
import { fetchTeamUsers, deactivateUser } from '@/lib/users-api';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MemberCard } from '@/components/team/MemberCard';
import { MemberFormModal } from '@/components/team/MemberFormModal';

type RoleTab = 'all' | UserRole;
type StatusTab = 'active' | 'inactive' | 'all';

const roleTabs: { value: RoleTab; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'manager', label: 'Managers' },
  { value: 'member', label: 'Members' },
];

const statusTabs: { value: StatusTab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
];

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const isAdmin = currentUser?.role === 'admin';

  const [role, setRole] = useState<RoleTab>('all');
  const [status, setStatus] = useState<StatusTab>('active');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>();
  const [deactivating, setDeactivating] = useState<User | undefined>();

  const filters = useMemo(
    () => ({
      role: role === 'all' ? undefined : role,
      department: department || undefined,
      search: search.trim() || undefined,
      isActive: status === 'all' ? undefined : ((status === 'active' ? 'true' : 'false') as 'true' | 'false'),
      limit: 100,
    }),
    [role, department, search, status],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['team-users', filters],
    queryFn: () => fetchTeamUsers(filters),
  });

  const users = data?.users ?? [];

  // Distinct department list from current set (drives dropdown).
  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(users.map((u) => u.department).filter(Boolean))).sort() as string[],
    [users],
  );

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success('Member deactivated');
      setDeactivating(undefined);
    },
  });

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (user: User) => {
    setEditing(user);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted">Manage members, roles, and access.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create Member
          </Button>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-surface-border bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg border border-surface-border bg-white p-1">
            {roleTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setRole(tab.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  role === tab.value
                    ? 'bg-primary-600 text-white'
                    : 'text-muted hover:bg-surface-subtle',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <Input
                placeholder="Search name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">All departments</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Status</span>
            <div className="flex gap-1 rounded-lg border border-surface-border bg-white p-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatus(tab.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    status === tab.value
                      ? 'bg-primary-600 text-white'
                      : 'text-muted hover:bg-surface-subtle',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-surface-border bg-white p-4">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="mt-3 h-3 w-full" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <Users className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No members found</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Try adjusting the filters, or invite your first teammate.
          </p>
          {canManage && (
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {users.map((u) => {
            const isSelf = currentUser?._id === u._id;
            return (
              <MemberCard
                key={u._id}
                user={u}
                canEdit={canManage || isSelf}
                canDeactivate={isAdmin && !isSelf}
                onOpen={() => {
                  /* MemberDetailModal lands in phase 2 */
                }}
                onEdit={openEdit}
                onDeactivate={setDeactivating}
              />
            );
          })}
        </div>
      )}

      <MemberFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        member={editing}
      />

      <ConfirmDialog
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(undefined)}
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating._id)}
        title="Deactivate member"
        message={`Deactivate ${deactivating?.name}? They will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
