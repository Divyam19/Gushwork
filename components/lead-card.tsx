import { AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import { TAG_THEME, initials } from '@/components/tag-theme';
import { BorderBeam } from '@/components/ui/border-beam';
import { Skeleton } from '@/components/ui/skeleton';
import { dueLabel, type QueueItem } from '@/lib/queue';
import type { MockRep } from '@/lib/mock';
import { cn } from '@/lib/utils';

// Shared by the table header and rows so columns line up.
export const COLS = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 md:grid-cols-[minmax(180px,1.1fr)_76px_minmax(0,2fr)_110px] lg:grid-cols-[minmax(200px,1.1fr)_76px_minmax(0,2fr)_110px_120px]';

export function LeadCard({
  item, today, rep, beam, faded, rest,
}: {
  item: QueueItem; today: string; rep: MockRep | undefined; beam?: boolean; faded?: boolean; rest: string;
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
  const reason = a.status === 'analyzing' ? <Skeleton className="h-3.5 w-56" aria-label="Agent is updating" /> : a.reason;
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        COLS,
        'relative px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50/40 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        faded && 'opacity-70',
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold', TAG_THEME[a.tag].avatar)} aria-hidden>
          {initials(item.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-zinc-900">{item.name}</span>
          <span className="block truncate text-xs text-zinc-500">{item.company}</span>
          <span className="block truncate text-xs text-zinc-500 md:hidden">{reason}</span>
        </span>
      </span>
      <span className="hidden md:block">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', TAG_THEME[a.tag].pill)} title={`Score ${a.score}`}>{a.tag}</span>
      </span>
      <span className="hidden min-w-0 items-center gap-1.5 text-zinc-600 md:flex">
        {a.status === 'error' && <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" aria-label={a.error ?? 'Analysis failed'} />}
        <span className="truncate">{reason}</span>
      </span>
      <span>
        <span className={cn('whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ring-1', dueTone)}>{faded ? 'Sent' : due.text}</span>
      </span>
      <span className="hidden min-w-0 items-center gap-2 text-zinc-600 lg:flex">
        {rep && <><RepAvatar rep={rep} size="sm" /><span className="truncate">{rep.name.split(' ')[0]}</span></>}
      </span>
      {beam && <BorderBeam size={100} duration={8} colorFrom="#f43f5e" colorTo="#6366f1" />}
    </Link>
  );
}
