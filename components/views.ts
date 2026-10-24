import { AlarmClockIcon, CalendarDaysIcon, CheckCircle2Icon, SunIcon } from 'lucide-react';
import type { Queue } from '@/lib/queue';

// Kept out of view-nav.tsx: that file is a client component, and the server page needs these values.
export const VIEWS = [
  { id: 'overdue', label: 'Overdue', short: 'Overdue', icon: AlarmClockIcon, tile: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
  { id: 'today', label: 'Due today', short: 'Today', icon: SunIcon, tile: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700' },
  { id: 'upcoming', label: 'Upcoming', short: 'Upcoming', icon: CalendarDaysIcon, tile: 'bg-zinc-600', badge: 'bg-zinc-200 text-zinc-700' },
  { id: 'done', label: 'Done today', short: 'Done', icon: CheckCircle2Icon, tile: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
] as const;
export type ViewId = (typeof VIEWS)[number]['id'];

export function viewCount(q: Queue, v: ViewId) {
  return { overdue: q.overdue.length, today: q.dueToday.length, upcoming: q.upcomingWeek.length + q.upcomingLater.length, done: q.doneToday.length }[v];
}
