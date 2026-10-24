import { AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import { BorderBeam } from '@/components/ui/border-beam';
import { Skeleton } from '@/components/ui/skeleton';
import { dueLabel, type QueueItem } from '@/lib/queue';
import type { MockRep } from '@/lib/mock';
import type { Tag } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const DOT: Record<Tag, string> = { Hot: 'bg-red-500', Warm: 'bg-amber-400', Cold: 'bg-slate-300' };

export function LeadCard({
  item, today, rep, showRep, beam, faded, rest,
}: {
  item: QueueItem; today: string; rep: MockRep | undefined; showRep: boolean; beam?: boolean; faded?: boolean; rest: string;
}) {
  const a = item.analysis!;
  const due = dueLabel(a.next_followup_date, today);
  const href = `/?${rest}${rest ? '&' : ''}lead=${item.id}`;
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        'relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        faded && 'opacity-60',
      )}
    >
      <span className={cn('size-2.5 shrink-0 rounded-full', DOT[a.tag])} title={`${a.tag} · score ${a.score}`} role="img" aria-label={`${a.tag} lead`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">
          {item.name} <span className="font-normal text-zinc-500">· {item.company}</span>
        </p>
        {a.status === 'analyzing' ? (
          <Skeleton className="mt-1 h-3.5 w-56" aria-label="Agent is updating" />
        ) : (
          <p className="truncate text-sm text-zinc-500">{a.reason}</p>
        )}
      </div>
      {a.status === 'error' && <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" aria-label={a.error ?? 'Analysis failed'} />}
      <span className={cn('shrink-0 text-sm tabular-nums', due.overdue && !faded ? 'font-medium text-red-600' : 'text-zinc-500')}>{due.text}</span>
      {showRep && rep && <RepAvatar rep={rep} size="sm" className="hidden sm:flex" />}
      {beam && <BorderBeam size={100} duration={8} colorFrom="#ef4444" colorTo="#6366f1" />}
    </Link>
  );
}
