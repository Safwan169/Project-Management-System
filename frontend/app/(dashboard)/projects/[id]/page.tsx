'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  ImageIcon,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { fetchProject, fetchProjectStats } from '@/lib/projects-api';
import { thumbnailUrl } from '@/lib/media';
import { formatCurrency, formatDate, formatDuration } from '@/lib/format';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ProjectTeamTab } from '@/components/projects/ProjectTeamTab';
import { ProjectSettingsTab } from '@/components/projects/ProjectSettingsTab';
import { SprintList } from '@/components/sprints/SprintList';
import { ProgressBar } from '@/components/ui/ProgressBar';

type Tab = 'sprints' | 'team' | 'settings';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [tab, setTab] = useState<Tab>('sprints');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
  });

  const { data: stats } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => fetchProjectStats(projectId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
        <p className="text-sm text-muted">This project could not be loaded.</p>
        <Link href="/projects" className="mt-2 inline-block text-sm font-medium text-primary-600">
          Back to projects
        </Link>
      </div>
    );
  }

  const { project } = data;
  const thumb = thumbnailUrl(project.thumbnail);

  const tabs: { value: Tab; label: string; hidden?: boolean }[] = [
    { value: 'sprints', label: 'Sprints & Tasks' },
    { value: 'team', label: 'Team' },
    { value: 'settings', label: 'Settings', hidden: !canManage },
  ];

  const statCards = [
    { label: 'Total Tasks', value: stats?.totalTasks ?? 0, icon: ListTodo },
    { label: 'Completed', value: stats?.completedTasks ?? 0, icon: CheckCircle2 },
    { label: 'Progress', value: `${stats?.progressPercent ?? 0}%`, icon: TrendingUp },
    {
      label: 'Time Logged',
      value: formatDuration(stats?.timeLogged ?? 0),
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted">
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{project.title}</span>
      </nav>

      {/* Header */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 sm:w-48">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={project.title} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-10 w-10 text-slate-300" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
              <Badge status={project.status}>{project.status}</Badge>
              {project.isOverdue && <Badge color="red">Overdue</Badge>}
            </div>
            <p className="text-sm text-muted">Client: {project.client}</p>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
              <span>
                {formatDate(project.startDate)} – {formatDate(project.endDate)}
              </span>
              <span>Budget: {formatCurrency(project.budget)}</span>
            </div>

            {project.description && (
              <p className="pt-1 text-sm text-foreground">{project.description}</p>
            )}

            <ProgressBar
              value={stats?.progressPercent ?? 0}
              label="Project progress"
              className="pt-1"
            />
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} padding="sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted">{label}</p>
                <p className="text-lg font-semibold text-foreground">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-border">
        <div className="flex gap-1">
          {tabs
            .filter((t) => !t.hidden)
            .map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === t.value
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-muted hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
        </div>
      </div>

      <div>
        {tab === 'sprints' && <SprintList project={project} canManage={canManage} />}
        {tab === 'team' && <ProjectTeamTab project={project} canManage={canManage} />}
        {tab === 'settings' && canManage && (
          <ProjectSettingsTab project={project} canDelete={user?.role === 'admin'} />
        )}
      </div>
    </div>
  );
}
