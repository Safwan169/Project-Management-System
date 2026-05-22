'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, LayoutGrid, Table2, FolderKanban } from 'lucide-react';
import type { Project, ProjectStatus } from '@/types';
import { fetchProjects, deleteProject } from '@/lib/projects-api';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';

type StatusTab = 'all' | ProjectStatus;
type ViewMode = 'grid' | 'table';

const statusTabs: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const VIEW_KEY = 'pms.projectsView';

export default function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [status, setStatus] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [client, setClient] = useState('');
  const [view, setView] = useState<ViewMode>('grid');

  // Restore the saved view preference once, on mount.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === 'grid' || saved === 'table') setView(saved);
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  };

  // Modal + delete-target state.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();
  const [deleting, setDeleting] = useState<Project | undefined>();

  const filters = useMemo(
    () => ({
      status: status === 'all' ? undefined : status,
      search: search.trim() || undefined,
      client: client.trim() || undefined,
    }),
    [status, search, client],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () => fetchProjects(filters),
  });

  const projects = useMemo(() => data?.projects ?? [], [data]);

  // Distinct client names from the current result set — drives the dropdown.
  const clientOptions = useMemo(
    () => Array.from(new Set(projects.map((p) => p.client))).sort(),
    [projects],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (warning) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(warning ?? 'Project deleted');
      setDeleting(undefined);
    },
  });

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (project: Project) => {
    setEditing(project);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted">Browse and manage your team&apos;s projects.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-surface-border bg-white p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                status === tab.value
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
              placeholder="Search title or client"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <select
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="">All clients</option>
            {clientOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-surface-border bg-white p-1">
            <button
              onClick={() => changeView('grid')}
              className={cn(
                'rounded-md p-1.5',
                view === 'grid' ? 'bg-primary-600 text-white' : 'text-muted hover:bg-surface-subtle',
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => changeView('table')}
              className={cn(
                'rounded-md p-1.5',
                view === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'text-muted hover:bg-surface-subtle',
              )}
              aria-label="Table view"
            >
              <Table2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-surface-border bg-white">
              <Skeleton className="h-32 rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <FolderKanban className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {canManage
              ? 'Get started by creating your first project.'
              : 'You have not been added to any projects yet.'}
          </p>
          {canManage && (
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </div>
      ) : (
        <ProjectTable projects={projects} onEdit={openEdit} onDelete={setDeleting} />
      )}

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        project={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting._id)}
        title="Delete project"
        message={`Delete "${deleting?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
