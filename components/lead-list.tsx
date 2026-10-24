import { LeadCard } from '@/components/lead-card';
import { ShowMore } from '@/components/show-more';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { dayLabel } from '@/lib/dates';
import type { MockRep } from '@/lib/mock';
import type { Queue, QueueItem } from '@/lib/queue';
import { cn } from '@/lib/utils';

interface Ctx { reps: MockRep[]; today: string; showRep: boolean; rest: string; mostUrgentId: string | null }

function Rows({ items, ctx, faded, limit }: { items: QueueItem[]; ctx: Ctx; faded?: boolean; limit?: number }) {
  const rows = items.map((i) => (
    <LeadCard key={i.id} item={i} today={ctx.today} rep={ctx.reps.find((r) => r.id === i.rep_id)} showRep={ctx.showRep} rest={ctx.rest} beam={i.id === ctx.mostUrgentId} faded={faded} />
  ));
  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-white shadow-xs">
      {limit ? <ShowMore limit={limit}>{rows}</ShowMore> : rows}
    </div>
  );
}

function Section({ id, title, count, tone, children }: { id: string; title: string; count: number; tone?: 'red'; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="mb-2 flex items-baseline gap-2 px-1 text-sm font-semibold text-zinc-900">
        {title}
        <span className={cn('text-sm font-normal tabular-nums', tone === 'red' ? 'text-red-600' : 'text-zinc-500')}>{count}</span>
      </h2>
      {children}
    </section>
  );
}

const trigger = 'px-1 text-sm font-semibold text-zinc-900 hover:no-underline';

export function LeadList({ q, ctx }: { q: Queue; ctx: Ctx }) {
  const nextUp = q.upcomingWeek[0] ?? q.upcomingLater[0];
  const nothingActive = !q.overdue.length && !q.dueToday.length;
  return (
    <div className="flex flex-col gap-7">
      {q.overdue.length > 0 && (
        <Section id="overdue" title="Overdue" count={q.overdue.length} tone="red">
          <Rows items={q.overdue} ctx={ctx} limit={5} />
        </Section>
      )}
      <Section id="due-today" title="Due today" count={q.dueToday.length}>
        {q.dueToday.length ? (
          <Rows items={q.dueToday} ctx={ctx} />
        ) : (
          <p className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-zinc-500">
            {nothingActive && nextUp
              ? `Nothing due today. Next up: ${nextUp.name}, ${dayLabel(nextUp.analysis!.next_followup_date).split(' ')[0]}.`
              : 'Nothing else due today.'}
          </p>
        )}
      </Section>

      <Accordion>
        <AccordionItem value="upcoming" id="upcoming" className="border-b-0">
          <AccordionTrigger className={trigger}>
            Upcoming <span className="font-normal text-zinc-500">{q.upcomingWeek.length + q.upcomingLater.length}</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4 pt-1">
              {q.upcomingWeek.length > 0 && (
                <div>
                  <h3 className="mb-1.5 px-1 text-xs text-zinc-500">Next 7 days</h3>
                  <Rows items={q.upcomingWeek} ctx={ctx} />
                </div>
              )}
              {q.upcomingLater.length > 0 && (
                <div>
                  <h3 className="mb-1.5 px-1 text-xs text-zinc-500">Later</h3>
                  <Rows items={q.upcomingLater} ctx={ctx} limit={5} />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="done" id="done-today" className="border-b-0">
          <AccordionTrigger className={trigger}>
            Done today <span className="font-normal text-zinc-500">{q.doneToday.length}</span>
          </AccordionTrigger>
          <AccordionContent>
            {q.doneToday.length ? <Rows items={q.doneToday} ctx={ctx} faded /> : <p className="px-1 text-sm text-zinc-500">Nothing sent yet today.</p>}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
