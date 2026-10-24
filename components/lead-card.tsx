import { AlertTriangleIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import { TAG_THEME, initials } from '@/components/tag-theme';
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
  const dueTone = faded
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : due.overdue
      ? 'bg-red-50 text-red-700 ring-red-200'
      : due.text === 'Due today'
        ? 'bg-sky-50 text-sky-700 ring-sky-200'
        : 'bg-zinc-50 text-zinc-600 ring-zinc-200';
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        'group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/80 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        faded && 'opacity-70',
      )}
    >
      <span
        className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-xs', TAG_THEME[a.tag].avatar)}
        title={`${a.tag} · score ${a.score}`}
        role="img"
        aria-label={`${a.tag} lead`}
      >
        {initials(item.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900">
          {item.name} <span className="font-normal text-zinc-500">· {item.company}</span>
        </p>
        {a.status === 'analyzing' ? (
          <Skeleton className="mt-1 h-3.5 w-56" aria-label="Agent is updating" />
        ) : (
          <p className="truncate text-[13px] text-zinc-500">{a.reason}</p>
        )}
      </div>
      {a.status === 'error' && <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" aria-label={a.error ?? 'Analysis failed'} />}
      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ring-1', dueTone)}>{faded ? 'Sent' : due.text}</span>
      {showRep && rep && <RepAvatar rep={rep} size="sm" className="hidden sm:flex" />}
      <ChevronRightIcon className="hidden size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500 sm:block" />
      {beam && <BorderBeam size={100} duration={8} colorFrom="#f43f5e" colorTo="#6366f1" />}
    </Link>
  );
}
