'use client';

import { FlameIcon, UsersIcon } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import type { MockRep } from '@/lib/mock';
import type { Queue } from '@/lib/queue';
import { VIEWS, viewCount, type ViewId } from '@/components/views';
import { cn } from '@/lib/utils';

// Shared by every moving highlight so they all settle the same way.
const SPRING = { type: 'spring', bounce: 0.18, duration: 0.5 } as const;

function Ring({ done, total }: { done: number; total: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const p = total ? done / total : 1;
  return (
    <svg viewBox="0 0 40 40" className="size-11 shrink-0 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="5" className="stroke-zinc-200" />
      <motion.circle
        cx="20" cy="20" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={c}
        className="stroke-emerald-500"
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - p) }}
        transition={{ type: 'spring', bounce: 0, duration: 1.1 }}
      />
    </svg>
  );
}

export function ViewNav({ q, view, rep, allHref }: { q: Queue; view: ViewId; rep?: MockRep; allHref: string }) {
  const { stats } = q;
  const total = stats.overdue + stats.dueToday + stats.sentToday;
  const href = (v: ViewId) => `/?${[rep && `rep=${rep.id}`, `view=${v}`].filter(Boolean).join('&')}`;
  // `contents` on phones so the segmented control can stick for the whole page; a real sidebar from md up.
  return (
    <aside className="contents md:flex md:flex-col md:gap-4 md:border-r md:border-zinc-200 md:p-4">
      {rep && (
        // Phones already show the selected rep in the chips, so the card is desktop-only.
        <div className="anim-rise hidden flex-col gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 md:flex">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <RepAvatar rep={rep} />
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Viewing</p>
              <p className="truncate text-sm font-semibold text-zinc-900">{rep.name}&apos;s leads</p>
            </div>
          </div>
          <Link
            href={allHref}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition active:scale-95 hover:bg-indigo-100"
          >
            <UsersIcon className="size-3.5" /> Show all reps
          </Link>
        </div>
      )}
      <p className="hidden px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 md:block">Follow-ups</p>
      <nav aria-label="Views" className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-zinc-50/90 px-4 py-2 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-4 gap-0.5 rounded-xl bg-zinc-200/70 p-0.5">
          {VIEWS.map((v) => {
            const active = v.id === view;
            const n = viewCount(q, v.id);
            return (
              <Link
                key={v.id}
                href={href(v.id)}
                aria-current={active ? 'page' : undefined}
                className="relative flex h-12 flex-col items-center justify-center rounded-[10px] leading-none transition-transform active:scale-[0.96]"
              >
                {active && <motion.span layoutId="view-seg" transition={SPRING} className="absolute inset-0 rounded-[10px] bg-white shadow-sm ring-1 ring-black/5" />}
                <span className={cn('relative text-[17px] font-semibold tabular-nums', active ? 'text-zinc-900' : 'text-zinc-500', v.id === 'overdue' && n > 0 && 'text-rose-600')}>{n}</span>
                <span className={cn('relative mt-1 text-[11px]', active ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-500')}>{v.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <nav aria-label="Views" className="hidden flex-col gap-1 md:flex">
        {VIEWS.map((v) => {
          const active = v.id === view;
          const Icon = v.icon;
          return (
            <Link
              key={v.id}
              href={href(v.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-[color,transform] active:scale-[0.97]',
                active ? 'font-semibold text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100',
              )}
            >
              {active && <motion.span layoutId="view-pill" transition={SPRING} className="absolute inset-0 rounded-lg bg-white shadow-xs ring-1 ring-zinc-200" />}
              <span className={cn('relative flex size-6 items-center justify-center rounded-md text-white transition-opacity', v.tile, !active && 'opacity-80')}>
                <Icon className="size-3.5" />
              </span>
              <span className="relative">{v.label}</span>
              <span className={cn('relative ml-auto rounded-full px-1.5 py-px text-xs font-semibold tabular-nums transition-colors duration-300', active ? v.badge : 'text-zinc-400')}>{viewCount(q, v.id)}</span>
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
