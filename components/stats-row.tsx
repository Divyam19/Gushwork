'use client';

import { NumberTicker } from '@/components/ui/number-ticker';
import { cn } from '@/lib/utils';
import type { Queue } from '@/lib/queue';

const ITEMS = [
  { key: 'overdue', label: 'overdue', href: '#overdue', color: 'text-red-600' },
  { key: 'dueToday', label: 'due today', href: '#due-today', color: 'text-zinc-900' },
  { key: 'hot', label: 'hot leads', href: undefined, color: 'text-zinc-900' },
  { key: 'sentToday', label: 'sent today', href: '#done-today', color: 'text-zinc-900' },
] as const;

export function StatsRow({ stats }: { stats: Queue['stats'] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 px-1">
      {ITEMS.map((t) => {
        const body = (
          <>
            <span className={cn('text-2xl font-semibold tabular-nums', t.color)}>
              <NumberTicker value={stats[t.key]} />
            </span>{' '}
            <span className="text-sm text-zinc-500">{t.label}</span>
          </>
        );
        return t.href ? (
          <a key={t.key} href={t.href} className="rounded-md hover:opacity-75 focus-visible:outline-2 focus-visible:outline-primary">{body}</a>
        ) : (
          <span key={t.key}>{body}</span>
        );
      })}
    </div>
  );
}
