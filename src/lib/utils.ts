import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  const due = new Date(y, m - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDateTime(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatLifetime(createdAt: string, closedAt: string | null): string {
  const ms = (closedAt ? new Date(closedAt).getTime() : Date.now()) - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'פחות מיום';
  if (days === 1) return 'יום';
  if (days < 7) return `${days} ימים`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return weeks === 1 ? 'שבוע' : `${weeks} שבועות`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? 'חודש' : `${months} חודשים`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'שנה' : `${years} שנים`;
}
