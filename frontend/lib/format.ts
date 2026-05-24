import { format } from 'date-fns';

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  return format(new Date(iso), 'MMM d, yyyy');
}

export function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Legacy: some stats may still use minutes.
export function formatDuration(minutes: number): string {
  if (!minutes) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Hours from time-log entries (API stores decimal hours). */
export function formatHours(hours: number): string {
  if (!hours) return '0h';
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
}
