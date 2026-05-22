'use client';

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { getQueryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/store/authStore';

// QueryClientProvider, AuthProvider and Toaster need browser context, so
// they live in this single client boundary rather than the server layout.
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#6366f1', secondary: '#f8fafc' } },
          error: { duration: 5000 },
        }}
      />
    </QueryClientProvider>
  );
}
