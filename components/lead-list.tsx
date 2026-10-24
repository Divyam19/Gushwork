import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LeadCard } from '@/components/lead-card';
import type { MockRep } from '@/lib/mock';
import { dayLabel } from '@/lib/dates';
import type { Queue, QueueItem } from '@/lib/queue';
import { cn } from '@/lib/utils';

interface Ctx { reps: MockRep[]; today: string; showRep: boolean; rest: string; mostUrgentId: string | null }

function Cards({ items, ctx, faded }: { items: QueueItem[]; ctx: Ctx; faded?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((i) => (
        <LeadCard key={i.id} item={i} today={ctx.today} rep={ctx.reps.find((r) => r.id === i.rep_id)} showRep={ctx.showRep} rest={ctx.rest} beam={i.id === ctx.mostUrgentId} faded={faded} />
      ))}
    </div>
  );
}

function Section({ id, title, count, tone, children }: { id: string; title: string; count: number; tone?: 'red'; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className={cn('mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide', tone === 'red' ? 'text-red-600' : 'text-zinc-600')}>
        {title}
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">{count}</span>
      </h2>
      {children}
    </section>
  );
}

export function LeadList({ q, ctx }: { q: Queue; ctx: Ctx }) {
  const nextUp = q.upcomingWeek[0] ?? q.upcomingLater[0];
  const nothingActive = !q.overdue.length && !q.dueToday.length;
  return (
    <div className="flex flex-col gap-8">
      {q.overdue.length > 0 && (
        <Section id="overdue" title="Overdue" count={q.overdue.length} tone="red">
          <Cards items={q.overdue} ctx={ctx} />
        </Section>
      )}
      <Section id="due-today" title="Due today" count={q.dueToday.length}>
        {q.dueToday.length ? (
          <Cards items={q.dueToday} ctx={ctx} />
        ) : (
          <p className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
            {nothingActive && nextUp
              ? `Nothing due today 🎉 — next up: ${nextUp.name}, ${dayLabel(nextUp.analysis!.next_followup_date).split(' ')[0]}.`
              : 'Nothing else due today.'}
          </p>
        )}
      </Section>

      <Accordion>
        <AccordionItem value="upcoming" id="upcoming">
          <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Upcoming ({q.upcomingWeek.length + q.upcomingLater.length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4 pt-1">
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Next 7 days</h3>
                {q.upcomingWeek.length ? <Cards items={q.upcomingWeek} ctx={ctx} /> : <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
              </div>
              {q.upcomingLater.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-medium text-muted-foreground">Later</h3>
                  <Cards items={q.upcomingLater} ctx={ctx} />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="done" id="done-today">
          <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Done today ({q.doneToday.length})
          </AccordionTrigger>
          <AccordionContent>
            {q.doneToday.length ? <Cards items={q.doneToday} ctx={ctx} faded /> : <p className="text-sm text-muted-foreground">Nothing sent yet today.</p>}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
