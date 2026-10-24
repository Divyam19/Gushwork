import { AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import { TagBadge } from '@/components/tag-badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { Skeleton } from '@/components/ui/skeleton';
import { dueLabel, type QueueItem } from '@/lib/queue';
import type { MockRep } from '@/lib/mock';
import { cn } from '@/lib/utils';

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
        'relative flex items-center gap-4 overflow-hidden rounded-xl border bg-white p-4 shadow-xs transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary animate-in fade-in duration-300',
        due.overdue && !faded && 'border-l-4 border-l-red-600 bg-red-50/60 hover:bg-red-50',
        faded && 'opacity-60',
      )}
    >
      <TagBadge tag={a.tag} score={a.score} className="w-24 shrink-0 flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-1.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="truncate font-semibold">{item.name} · {item.company}</span>
          {item.product_interest && (
            <span className="hidden rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 sm:inline">{item.product_interest}</span>
          )}
        </div>
        {a.status === 'analyzing' ? (
          <Skeleton className="mt-1 h-4 w-56" aria-label="Agent is updating" />
        ) : (
          <p className="truncate text-sm text-muted-foreground">{a.reason}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {a.status === 'error' && <AlertTriangleIcon className="size-4 text-amber-600" aria-label={a.error ?? 'Analysis failed'} />}
        <span className={cn('text-sm', due.overdue ? 'font-bold text-red-600' : 'text-muted-foreground')}>{due.text}</span>
        {showRep && rep && <RepAvatar rep={rep} size="sm" />}
      </div>
      {beam && <BorderBeam size={120} duration={8} colorFrom="#dc2626" colorTo="#6366f1" />}
    </Link>
  );
}
