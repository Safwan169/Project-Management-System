'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { Sidebar } from '@/components/shared/Sidebar';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect unauthenticated visitors once the session check has finished.
  // Doing this in an effect (not during render) keeps it React-safe.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Session still being resolved — show a spinner instead of flashing
  // either the dashboard or the login redirect.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  // Not authenticated: render nothing while the effect above redirects.
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
