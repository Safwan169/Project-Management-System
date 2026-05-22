'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import type { User } from '@/types';
import { searchUsers, addProjectMember } from '@/lib/projects-api';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

const roleOptions = [
  { value: 'member', label: 'Member' },
  { value: 'manager', label: 'Manager' },
];

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Ids already on the project — excluded from the results. */
  existingMemberIds: string[];
}

export function AddMemberModal({
  open,
  onClose,
  projectId,
  existingMemberIds,
}: AddMemberModalProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [role, setRole] = useState('member');

  // Only search once the user has typed something meaningful.
  const { data: users = [], isFetching } = useQuery({
    queryKey: ['user-search', query],
    queryFn: () => searchUsers(query),
    enabled: open && query.trim().length >= 2,
  });

  const candidates = users.filter((u) => !existingMemberIds.includes(u._id));

  const mutation = useMutation({
    mutationFn: () => addProjectMember(projectId, selected!._id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member added');
      handleClose();
    },
  });

  const handleClose = () => {
    setQuery('');
    setSelected(null);
    setRole('member');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add member"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!selected}
            isLoading={mutation.isPending}
          >
            Add to project
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          placeholder="Search users by name or email"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          leftIcon={<Search className="h-4 w-4" />}
        />

        {/* Results list */}
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {query.trim().length < 2 && (
            <p className="py-4 text-center text-sm text-muted">Type at least 2 characters.</p>
          )}
          {query.trim().length >= 2 && isFetching && (
            <p className="py-4 text-center text-sm text-muted">Searching…</p>
          )}
          {query.trim().length >= 2 && !isFetching && candidates.length === 0 && (
            <p className="py-4 text-center text-sm text-muted">No matching users.</p>
          )}
          {candidates.map((u) => (
            <button
              key={u._id}
              onClick={() => setSelected(u)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                selected?._id === u._id ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-surface-subtle'
              }`}
            >
              <Avatar name={u.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <Select
            label={`Role for ${selected.name}`}
            options={roleOptions}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        )}
      </div>
    </Modal>
  );
}
