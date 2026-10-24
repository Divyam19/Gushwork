import { AlarmClockIcon, CalendarDaysIcon, CheckCircle2Icon, SunIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { LeadCard } from '@/components/lead-card';
import { ShowMore } from '@/components/show-more';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { dayLabel } from '@/lib/dates';
import type { MockRep } from '@/lib/mock';
import type { Queue, QueueItem } from '@/lib/queue';
import { cn } from '@/lib/utils';

interface Ctx { reps: MockRep[]; today: string; showRep: boolean; rest: string; mostUrgentId: string | null }

// Each bucket gets one colour, used only for its header band and count.
const TONE = {
  rose: { band: 'bg-rose-50/80', icon: 'bg-rose-500 text-white', count: 'bg-rose-100 text-rose-700' },
  sky: { band: 'bg-sky-50/80', icon: 'bg-sky-500 text-white', count: 'bg-sky-100 text-sky-700' },
  slate: { band: 'bg-zinc-50', icon: 'bg-zinc-700 text-white', count: 'bg-zinc-200 text-zinc-700' },
  emerald: { band: 'bg-emerald-50/80', icon: 'bg-emerald-500 text-white', count: 'bg-emerald-100 text-emerald-700' },
} as const;
type Tone = keyof typeof TONE;

function Rows({ items, ctx, faded, limit }: { items: QueueItem[]; ctx: Ctx; faded?: boolean; limit?: number }) {
  const rows = items.map((i) => (
    <LeadCard key={i.id} item={i} today={ctx.today} rep={ctx.reps.find((r) => r.id === i.rep_id)} showRep={ctx.showRep} rest={ctx.rest} beam={i.id === ctx.mostUrgentId} faded={faded} />
  ));
  return <div className="divide-y divide-zinc-100">{limit ? <ShowMore limit={limit}>{rows}</ShowMore> : rows}</div>;
}

function Head({ tone, icon, title, count, hint }: { tone: Tone; icon: ReactNode; title: string; count: number; hint?: string }) {
  const t = TONE[tone];
  return (
    <span className="flex flex-1 items-center gap-2.5">
      <span className={cn('flex size-6 items-center justify-center rounded-lg [&_svg]:size-3.5', t.icon)}>{icon}</span>
      <span className="text-sm font-semibold text-zinc-900">{title}</span>
      <span className={cn('rounded-full px-2 py-px text-xs font-semibold tabular-nums', t.count)}>{count}</span>
      {hint && <span className="ml-auto hidden text-xs font-normal text-zinc-500 sm:inline">{hint}</span>}
    </span>
  );
}

function Card({ id, tone, head, children }: { id: string; tone: Tone; head: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
      <div className={cn('flex items-center border-b border-zinc-100 px-4 py-2.5', TONE[tone].band)}>{head}</div>
      {children}
    </section>
  );
}

const trigger = 'items-center px-4 py-2.5 hover:no-underline';

export function LeadList({ q, ctx }: { q: Queue; ctx: Ctx }) {
  const nextUp = q.upcomingWeek[0] ?? q.upcomingLater[0];
  const nothingActive = !q.overdue.length && !q.dueToday.length;
  const upcoming = q.upcomingWeek.length + q.upcomingLater.length;
  return (
    <div className="flex flex-col gap-5">
      {q.overdue.length > 0 && (
        <Card id="overdue" tone="rose" head={<Head tone="rose" icon={<AlarmClockIcon />} title="Overdue" count={q.overdue.length} hint="Hottest first" />}>
          <Rows items={q.overdue} ctx={ctx} limit={5} />
        </Card>
      )}

      <Card id="due-today" tone="sky" head={<Head tone="sky" icon={<SunIcon />} title="Due today" count={q.dueToday.length} />}>
        {q.dueToday.length ? (
          <Rows items={q.dueToday} ctx={ctx} />
        ) : (
          <p className="p-6 text-center text-sm text-zinc-500">
            {nothingActive && nextUp
              ? `Nothing due today. Next up: ${nextUp.name}, ${dayLabel(nextUp.analysis!.next_followup_date).split(' ')[0]}.`
              : 'Nothing else due today.'}
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Accordion className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <AccordionItem value="upcoming" id="upcoming" className="scroll-mt-20">
            <AccordionTrigger className={cn(trigger, TONE.slate.band)}>
              <Head tone="slate" icon={<CalendarDaysIcon />} title="Upcoming" count={upcoming} />
            </AccordionTrigger>
            <AccordionContent className="pb-0 [&_a]:no-underline [&_p:not(:last-child)]:mb-0">
              {q.upcomingWeek.length > 0 && (
                <>
                  <h3 className="border-y border-zinc-100 bg-zinc-50/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Next 7 days</h3>
                  <Rows items={q.upcomingWeek} ctx={ctx} />
                </>
              )}
              {q.upcomingLater.length > 0 && (
                <>
                  <h3 className="border-y border-zinc-100 bg-zinc-50/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Later</h3>
                  <Rows items={q.upcomingLater} ctx={ctx} limit={5} />
                </>
              )}
              {!upcoming && <p className="p-4 text-sm text-zinc-500">Nothing scheduled.</p>}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Accordion className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <AccordionItem value="done" id="done-today" className="scroll-mt-20">
            <AccordionTrigger className={cn(trigger, TONE.emerald.band)}>
              <Head tone="emerald" icon={<CheckCircle2Icon />} title="Done today" count={q.doneToday.length} />
            </AccordionTrigger>
            <AccordionContent className="pb-0 [&_a]:no-underline [&_p:not(:last-child)]:mb-0">
              {q.doneToday.length ? <Rows items={q.doneToday} ctx={ctx} faded /> : <p className="border-t border-zinc-100 p-4 text-sm text-zinc-500">Nothing sent yet today.</p>}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
