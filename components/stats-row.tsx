'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { TAG_THEME, initials } from '@/components/tag-theme';
import { NumberTicker } from '@/components/ui/number-ticker';
import type { Queue, QueueItem } from '@/lib/queue';
import { cn } from '@/lib/utils';

const CHIPS = [
  { key: 'overdue', label: 'Overdue', href: '#overdue', dot: 'bg-rose-400' },
  { key: 'dueToday', label: 'Due today', href: '#due-today', dot: 'bg-sky-300' },
  { key: 'hot', label: 'Hot leads', href: undefined, dot: 'bg-orange-300' },
  { key: 'sentToday', label: 'Sent today', href: '#done-today', dot: 'bg-emerald-300' },
] as const;

function Ring({ done, total }: { done: number; total: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const p = total ? done / total : 1;
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-white/15" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)}
          className="text-emerald-300 transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-lg font-bold tabular-nums">{Math.round(p * 100)}%</span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-white/60">done</span>
      </span>
    </div>
  );
}

export function TodayHero({
  stats, date, greeting, next, nextHref,
}: { stats: Queue['stats']; date: string; greeting: string; next: QueueItem | null; nextHref: string | null }) {
  const open = stats.overdue + stats.dueToday;
  const total = open + stats.sentToday;
  const a = next?.analysis;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20 sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-violet-400/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <Ring done={stats.sentToday} total={total} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-200">{date}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">{greeting}</h1>
            <p className="mt-1 text-sm text-indigo-100">
              {open > 0 ? (
                <><b className="font-semibold text-white">{open} follow-up{open === 1 ? '' : 's'}</b> need you today · {stats.sentToday} of {total} done</>
              ) : (
                'You’re all caught up for today.'
              )}
            </p>
          </div>
        </div>

        {next && a && nextHref && (
          <Link
            href={nextHref}
            scroll={false}
            className="group flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 pr-4 text-zinc-900 shadow-xl shadow-indigo-900/20 ring-1 ring-white/50 transition hover:-translate-y-0.5 lg:max-w-sm"
          >
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold', TAG_THEME[a.tag].avatar)}>{initials(next.name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Start here</span>
              <span className="block truncate text-sm font-semibold">{next.name} · <span className="font-normal text-zinc-500">{next.company}</span></span>
              <span className="block truncate text-xs text-zinc-500">{a.reason}</span>
            </span>
            <ArrowRightIcon className="size-4 shrink-0 text-indigo-600 transition group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2">
        {CHIPS.map((t) => {
          const body = (
            <>
              <span className={cn('size-2 rounded-full', t.dot)} />
              <span className="text-base font-semibold tabular-nums"><NumberTicker value={stats[t.key]} className="text-white" /></span>
              <span className="text-indigo-100">{t.label}</span>
            </>
          );
          const cls = 'flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm ring-1 ring-white/15 backdrop-blur-sm';
          return t.href ? (
            <a key={t.key} href={t.href} className={cn(cls, 'transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white')}>{body}</a>
          ) : (
            <span key={t.key} className={cls}>{body}</span>
          );
        })}
      </div>
    </section>
  );
}
