'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { SummaryReportTab } from '@/components/reports/SummaryReportTab';
import { ProjectReportTab } from '@/components/reports/ProjectReportTab';
import { UserReportTab } from '@/components/reports/UserReportTab';

type Tab = 'summary' | 'project' | 'user';

const tabs: { value: Tab; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'project', label: 'Project' },
  { value: 'user', label: 'User' },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('summary');

  const canView = user?.role === 'admin' || user?.role === 'manager';
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Lock className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Reports are restricted</h3>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Only admins and managers can view reports. Ask your admin if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted">
          Track delivery, contribution, and project health across the org.
        </p>
      </div>

      <div className="border-b border-surface-border">
        <div className="flex gap-1">
          {tabs.map((t) => (
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

      {tab === 'summary' && <SummaryReportTab />}
      {tab === 'project' && <ProjectReportTab />}
      {tab === 'user' && <UserReportTab />}
    </div>
  );
}
