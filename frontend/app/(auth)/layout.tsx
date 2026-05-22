import { ReactNode } from 'react';

// Shared shell for login/register — a centered card on a light gray page.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
