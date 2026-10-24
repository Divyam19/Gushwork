import { AlarmClockIcon, CalendarDaysIcon, CheckCircle2Icon, FlameIcon, SunIcon } from 'lucide-react';
import Link from 'next/link';
import type { Queue } from '@/lib/queue';
import { cn } from '@/lib/utils';

export const VIEWS = [
  { id: 'overdue', label: 'Overdue', icon: AlarmClockIcon, tile: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
  { id: 'today', label: 'Due today', icon: SunIcon, tile: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700' },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarDaysIcon, tile: 'bg-zinc-600', badge: 'bg-zinc-200 text-zinc-700' },
  { id: 'done', label: 'Done today', icon: CheckCircle2Icon, tile: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
] as const;
export type ViewId = (typeof VIEWS)[number]['id'];

export function viewCount(q: Queue, v: ViewId) {
  return { overdue: q.overdue.length, today: q.dueToday.length, upcoming: q.upcomingWeek.length + q.upcomingLater.length, done: q.doneToday.length }[v];
}

function Ring({ done, total }: { done: number; total: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const p = total ? done / total : 1;
  return (
    <svg viewBox="0 0 40 40" className="size-11 shrink-0 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="5" className="stroke-zinc-200" />
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} className="stroke-emerald-500" />
    </svg>
  );
}

export function ViewNav({ q, view, href }: { q: Queue; view: ViewId; href: (v: ViewId) => string }) {
  const { stats } = q;
  const total = stats.overdue + stats.dueToday + stats.sentToday;
  return (
    <aside className="flex flex-col gap-4 border-zinc-200 p-3 md:border-r md:p-4">
      <p className="hidden px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 md:block">Follow-ups</p>
      <nav aria-label="Views" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:mx-0 md:flex-col md:overflow-visible md:px-0">
        {VIEWS.map((v) => {
          const active = v.id === view;
          const Icon = v.icon;
          return (
            <Link
              key={v.id}
              href={href(v.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition',
                active ? 'bg-white font-semibold text-zinc-900 shadow-xs ring-1 ring-zinc-200' : 'text-zinc-600 hover:bg-zinc-100',
              )}
            >
              <span className={cn('flex size-6 items-center justify-center rounded-md text-white', v.tile, !active && 'opacity-80')}>
                <Icon className="size-3.5" />
              </span>
              {v.label}
              <span className={cn('ml-auto rounded-full px-1.5 py-px text-xs font-semibold tabular-nums', active ? v.badge : 'text-zinc-400')}>{viewCount(q, v.id)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden rounded-xl border border-zinc-200 bg-white p-3 md:block">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Today</p>
        <div className="mt-2 flex items-center gap-3">
          <Ring done={stats.sentToday} total={total} />
          <div className="text-sm leading-tight">
            <p className="font-semibold text-zinc-900 tabular-nums">{stats.sentToday} of {total} sent</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
              <FlameIcon className="size-3 text-rose-500" /> {stats.hot} hot lead{stats.hot === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
