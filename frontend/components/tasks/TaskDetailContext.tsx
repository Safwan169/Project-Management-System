'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TaskDetailModal } from './TaskDetailModal';

interface TaskDetailContextValue {
  openTask: (id: string) => void;
  closeTask: () => void;
  taskId: string | null;
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

export function TaskDetailProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    setTaskId(taskIdFromUrl);
  }, [taskIdFromUrl]);

  const openTask = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('taskId', id);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const closeTask = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('taskId');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setTaskId(null);
  }, [router, pathname, searchParams]);

  return (
    <TaskDetailContext.Provider value={{ openTask, closeTask, taskId }}>
      {children}
      <TaskDetailModal taskId={taskId} open={Boolean(taskId)} onClose={closeTask} />
    </TaskDetailContext.Provider>
  );
}

export function useTaskDetail(): TaskDetailContextValue {
  const ctx = useContext(TaskDetailContext);
  if (!ctx) {
    throw new Error('useTaskDetail must be used within TaskDetailProvider');
  }
  return ctx;
}
