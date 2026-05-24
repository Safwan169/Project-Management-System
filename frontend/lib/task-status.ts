import type { TaskStatus, UserRole } from '@/types';

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export function canApproveDone(role?: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

/** Status values shown in dropdowns — members never see "Done". */
export function statusOptionsForRole(role?: UserRole) {
  if (canApproveDone(role)) return TASK_STATUS_OPTIONS;
  return TASK_STATUS_OPTIONS.filter((s) => s.value !== 'done');
}

/**
 * Maps a requested status for non-privileged users.
 * "Done" always becomes "review" (request completion).
 */
export function resolveStatusUpdate(
  requested: TaskStatus,
  role?: UserRole,
): TaskStatus {
  if (canApproveDone(role)) return requested;
  if (requested === 'done') return 'review';
  return requested;
}

export function wasBlockedDoneAttempt(
  requested: TaskStatus,
  resolved: TaskStatus,
  role?: UserRole,
): boolean {
  return !canApproveDone(role) && requested === 'done' && resolved === 'review';
}
