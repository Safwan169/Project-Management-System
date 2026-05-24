'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import type { Project } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAuth } from '@/store/authStore';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface ProjectTableProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectTable({ projects, onEdit, onDelete }: ProjectTableProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border bg-white shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Tasks</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Budget</th>
            <th className="px-4 py-3 font-medium">End date</th>
            {canManage && <th className="px-4 py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const total = project.totalTasks ?? 0;
            const done = project.completedTasks ?? 0;
            const pct =
              project.progressPercent ?? (total > 0 ? Math.round((done / total) * 100) : 0);
            return (
              <tr
                key={project._id}
                onClick={() => router.push(`/projects/${project._id}`)}
                className="cursor-pointer border-b border-surface-border last:border-0 hover:bg-surface-subtle"
              >
                <td className="px-4 py-3 font-medium text-foreground">{project.title}</td>
                <td className="px-4 py-3 text-muted">{project.client}</td>
                <td className="px-4 py-3">
                  <Badge status={project.status}>{project.status}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted">
                  {done}/{total}
                </td>
                <td className="w-40 px-4 py-3">
                  <ProgressBar value={pct} showLabel={false} />
                </td>
                <td className="px-4 py-3 text-muted">{formatCurrency(project.budget)}</td>
                <td
                  className={`px-4 py-3 ${
                    project.isOverdue ? 'font-medium text-red-600' : 'text-muted'
                  }`}
                >
                  {formatDate(project.endDate)}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(project);
                        }}
                        className="rounded-md p-1.5 text-muted hover:bg-surface-subtle hover:text-foreground"
                        aria-label="Edit project"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(project);
                        }}
                        className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
