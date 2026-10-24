'use client';

import { NumberTicker } from '@/components/ui/number-ticker';
import { cn } from '@/lib/utils';
import type { Queue } from '@/lib/queue';

const TILES = [
  { key: 'overdue', label: 'Overdue', href: '#overdue', color: 'text-red-600' },
  { key: 'dueToday', label: 'Due today', href: '#due-today', color: 'text-amber-600' },
  { key: 'hot', label: 'Hot leads', href: undefined, color: 'text-foreground' },
  { key: 'sentToday', label: 'Sent today', href: '#done-today', color: 'text-foreground' },
] as const;

export function StatsRow({ stats }: { stats: Queue['stats'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map((t) => {
        const body = (
          <>
            <div className={cn('text-4xl font-semibold tabular-nums', t.color)}>
              <NumberTicker value={stats[t.key]} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{t.label}</div>
          </>
        );
        const cls = 'rounded-xl border bg-white p-4 shadow-xs';
        return t.href ? (
          <a key={t.key} href={t.href} className={cn(cls, 'transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-primary')}>{body}</a>
        ) : (
          <div key={t.key} className={cls}>{body}</div>
        );
      })}
    </div>
  );
}
