'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { fetchProjects } from '@/lib/projects-api';
import { fetchProjectReport } from '@/lib/reports-api';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar, SegmentedProgress } from '@/components/ui/ProgressBar';

export function ProjectReportTab() {
  const [projectId, setProjectId] = useState('');
  const [search, setSearch] = useState('');

  const { data: projectList } = useQuery({
    queryKey: ['projects', { limit: 100, search }],
    queryFn: () => fetchProjects({ limit: 100, search: search || undefined }),
  });
  const projects = projectList?.projects ?? [];

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', 'project', projectId],
    queryFn: () => fetchProjectReport(projectId),
    enabled: Boolean(projectId),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Filter projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-surface-border bg-white pl-10 pr-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-72"
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!projectId ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">
            Pick a project above to see its report.
          </p>
        </Card>
      ) : isLoading || !report ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{report.project.title}</h2>
                <p className="text-xs text-muted">
                  {formatDate(report.project.startDate)} – {formatDate(report.project.endDate)}
                  {report.project.budget !== undefined &&
                    ` · Budget ${formatCurrency(report.project.budget)}`}
                </p>
              </div>
              <Badge status={report.project.status}>{report.project.status}</Badge>
            </div>
            <ProgressBar
              value={report.progressPercent}
              label="Overall progress"
              className="mt-4"
            />
            <div className="mt-4">
              <SegmentedProgress
                todo={report.taskStats.todo}
                inprogress={report.taskStats.inprogress}
                review={report.taskStats.review}
                done={report.taskStats.done}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <StatBox label="Total tasks" value={report.taskStats.total} />
              <StatBox label="Done" value={report.taskStats.done} />
              <StatBox
                label="Overdue"
                value={report.taskStats.overdue}
                tone={report.taskStats.overdue > 0 ? 'text-red-600' : undefined}
              />
              <StatBox label="Time logged" value={`${report.timeLoggedTotal}h`} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-foreground">Sprint Breakdown</h2>
            {report.sprintBreakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No sprints in this project.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-surface-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Sprint</th>
                      <th className="px-4 py-2.5 font-medium">Tasks</th>
                      <th className="px-4 py-2.5 font-medium">Completed</th>
                      <th className="px-4 py-2.5 font-medium">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {report.sprintBreakdown.map((s) => (
                      <tr key={s.sprintId}>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-muted">
                            #{s.sprintNumber}
                          </span>{' '}
                          <span className="font-medium text-foreground">{s.title}</span>
                        </td>
                        <td className="px-4 py-3 text-muted">{s.taskCount}</td>
                        <td className="px-4 py-3 text-muted">{s.completedCount}</td>
                        <td className="px-4 py-3">
                          <ProgressBar
                            value={s.progressPercent}
                            showLabel={false}
                            className="w-32"
                          />
                          <span className="text-xs text-muted">{s.progressPercent}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-foreground">Member Contributions</h2>
            {report.memberContributions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Nobody has activity in this project yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-surface-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Member</th>
                      <th className="px-4 py-2.5 font-medium">Assigned</th>
                      <th className="px-4 py-2.5 font-medium">Completed</th>
                      <th className="px-4 py-2.5 font-medium">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {report.memberContributions.map((m) => (
                      <tr key={m.userId}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={m.name} src={m.avatar ?? undefined} size="sm" />
                            <span className="font-medium text-foreground">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{m.tasksAssigned}</td>
                        <td className="px-4 py-3 text-muted">{m.tasksCompleted}</td>
                        <td className="px-4 py-3 text-muted">{m.hoursLogged}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-surface-border p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone ?? 'text-foreground'}`}>{value}</p>
    </div>
  );
}
