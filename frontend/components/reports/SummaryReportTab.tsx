'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { FolderKanban, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { fetchSummaryReport } from '@/lib/reports-api';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  planned: '#94a3b8',
  active: '#6366f1',
  completed: '#10b981',
  archived: '#cbd5e1',
} as const;

export function SummaryReportTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'summary'],
    queryFn: fetchSummaryReport,
  });

  const completionRate =
    data && data.totalTasksAcrossProjects > 0
      ? Math.round(
          ((data.totalTasksAcrossProjects - data.overdueTasks) /
            data.totalTasksAcrossProjects) *
            100,
        )
      : 0;

  const statCards = [
    {
      label: 'Active Projects',
      value: data?.activeProjects ?? 0,
      icon: FolderKanban,
      tone: 'text-primary-600 bg-primary-50',
    },
    {
      label: 'Overdue Tasks',
      value: data?.overdueTasks ?? 0,
      icon: AlertTriangle,
      tone: 'text-red-600 bg-red-50',
    },
    {
      label: 'Hours This Month',
      value: data?.totalHoursLoggedThisMonth ?? 0,
      icon: Clock,
      tone: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'On-Track Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      tone: 'text-emerald-600 bg-emerald-50',
    },
  ];

  const breakdownData = data
    ? Object.entries(data.projectStatusBreakdown)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => ({
          name: key,
          value: count,
          fill: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
        }))
    : [];

  const maxContribHours = data
    ? Math.max(...data.topContributors.map((c) => c.hoursLogged), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} padding="sm">
            <div className="flex items-center gap-3">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tone)}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted">{label}</p>
                <p className="text-lg font-semibold text-foreground">
                  {isLoading ? '—' : value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Project Status Breakdown
          </h2>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : breakdownData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">No projects yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {breakdownData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Top Contributors</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data || data.topContributors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No contributions logged this month.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.topContributors.map((c) => {
                const width = (c.hoursLogged / maxContribHours) * 100;
                return (
                  <li key={c.userId} className="flex items-center gap-3">
                    <Avatar name={c.name} src={c.avatar ?? undefined} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                        <p className="shrink-0 text-xs text-muted">
                          {c.hoursLogged}h · {c.tasksCompleted} done
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-primary-600"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
