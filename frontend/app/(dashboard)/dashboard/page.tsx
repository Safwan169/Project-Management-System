'use client';

import { useAuth } from '@/store/authStore';
import { Card } from '@/components/ui/Card';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted">Here&apos;s what&apos;s happening across your projects.</p>
      </div>

      <Card>
        <p className="text-sm text-muted">
          Dashboard widgets will go here — project summaries, sprint progress, and assigned tasks.
        </p>
      </Card>
    </div>
  );
}
