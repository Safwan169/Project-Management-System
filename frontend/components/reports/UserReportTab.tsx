'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { User } from '@/types';
import { fetchTeamUsers } from '@/lib/users-api';
import { fetchUserReport } from '@/lib/reports-api';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

const PRIORITY_COLORS = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
} as const;

export function UserReportTab() {
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');

  const { data: userList } = useQuery({
    queryKey: ['team-users', { search, limit: 100 }],
    queryFn: () => fetchTeamUsers({ search: search || undefined, limit: 100 }),
  });
  const users = userList?.users ?? [];

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', 'user', userId],
    queryFn: () => fetchUserReport(userId),
    enabled: Boolean(userId),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Filter members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-surface-border bg-white pl-10 pr-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-72"
          >
            <option value="">Select a member…</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!userId ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">
            Pick a member above to see their report.
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
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={report.user.name} src={report.user.avatar} size="xl" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground">{report.user.name}</h2>
                <p className="text-xs text-muted">{report.user.email}</p>
                <div className="mt-1.5">
                  <Badge role={report.user.role}>{report.user.role}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <StatBox label="Projects" value={report.projectsCount} />
              <StatBox label="Tasks assigned" value={report.tasksAssigned} />
              <StatBox label="Completion rate" value={`${report.completionRate}%`} />
              <StatBox label="Hours logged" value={`${report.totalHoursLogged}h`} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-base font-semibold text-foreground">Tasks by Priority</h2>
              {Object.values(report.tasksByPriority).every((v) => v === 0) ? (
                <p className="py-8 text-center text-sm text-muted">No tasks assigned.</p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={(['critical', 'high', 'medium', 'low'] as const).map((key) => ({
                        priority: key,
                        count: report.tasksByPriority[key],
                      }))}
                      margin={{ top: 5, right: 16, left: 16, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="priority"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          textTransform: 'capitalize',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {(['critical', 'high', 'medium', 'low'] as const).map((key) => (
                          <Cell key={key} fill={PRIORITY_COLORS[key]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 text-base font-semibold text-foreground">Recent Activity</h2>
              {report.recentActivity.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No recent activity.</p>
              ) : (
                <ul className="space-y-3">
                  {report.recentActivity.map((item) => {
                    const u =
                      typeof item.entry.user === 'string' ? null : (item.entry.user as User);
                    const detail =
                      item.entry.oldValue && item.entry.newValue
                        ? `${item.entry.oldValue} → ${item.entry.newValue}`
                        : item.entry.newValue ?? '';
                    return (
                      <li key={item.entry._id} className="flex items-start gap-3 text-xs">
                        <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground">
                            <span className="font-medium">{u?.name ?? 'Someone'}</span>{' '}
                            <span className="text-muted">{item.entry.action}</span>{' '}
                            <span className="font-medium text-primary-600">
                              {item.taskTitle}
                            </span>
                            {detail && <span className="text-muted"> · {detail}</span>}
                          </p>
                          <p className="text-[11px] text-muted">
                            {formatDistanceToNow(new Date(item.entry.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-surface-border p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
