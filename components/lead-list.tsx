import { COLS, LeadCard } from '@/components/lead-card';
import { dayLabel } from '@/lib/dates';
import type { MockRep } from '@/lib/mock';
import type { Queue, QueueItem } from '@/lib/queue';
import type { ViewId } from '@/components/views';
import { cn } from '@/lib/utils';

interface Ctx { reps: MockRep[]; today: string; rest: string; mostUrgentId: string | null }

function Rows({ items, ctx, faded }: { items: QueueItem[]; ctx: Ctx; faded?: boolean }) {
  return items.map((i, n) => (
    <LeadCard key={i.id} index={n} item={i} today={ctx.today} rep={ctx.reps.find((r) => r.id === i.rep_id)} rest={ctx.rest} beam={i.id === ctx.mostUrgentId} faded={faded} />
  ));
}

function Group({ label }: { label: string }) {
  return <div className="bg-zinc-50/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="anim-rise px-4 py-16 text-center text-sm text-zinc-500">{children}</p>;
}

export function LeadTable({ q, view, ctx }: { q: Queue; view: ViewId; ctx: Ctx }) {
  const nextUp = q.upcomingWeek[0] ?? q.upcomingLater[0];
  let body: React.ReactNode;
  if (view === 'overdue') body = q.overdue.length ? <Rows items={q.overdue} ctx={ctx} /> : <Empty>Nothing overdue. Nice work.</Empty>;
  else if (view === 'today')
    body = q.dueToday.length ? (
      <Rows items={q.dueToday} ctx={ctx} />
    ) : (
      <Empty>{nextUp ? `Nothing due today. Next up: ${nextUp.name}, ${dayLabel(nextUp.analysis!.next_followup_date).split(' ')[0]}.` : 'Nothing due today.'}</Empty>
    );
  else if (view === 'upcoming')
    body = q.upcomingWeek.length + q.upcomingLater.length ? (
      <>
        {q.upcomingWeek.length > 0 && <><Group label="Next 7 days" /><Rows items={q.upcomingWeek} ctx={ctx} /></>}
        {q.upcomingLater.length > 0 && <><Group label="Later" /><Rows items={q.upcomingLater} ctx={ctx} /></>}
      </>
    ) : (
      <Empty>Nothing scheduled.</Empty>
    );
  else body = q.doneToday.length ? <Rows items={q.doneToday} ctx={ctx} faded /> : <Empty>Nothing sent yet today.</Empty>;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className={cn(COLS, 'border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500')}>
        <span>Lead</span>
        <span className="hidden md:block">Status</span>
        <span className="hidden md:block">Next step</span>
        <span>Due</span>
        <span className="hidden lg:block">Owner</span>
      </div>
      <div key={view} className="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto">{body}</div>
    </div>
  );
}
