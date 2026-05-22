'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { Spinner } from '@/components/ui/Spinner';

// Entry point — sends visitors to the dashboard or login once the session
// rehydration has resolved.
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <Spinner size="lg" className="text-primary-600" />
    </div>
  );
}
