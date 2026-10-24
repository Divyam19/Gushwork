'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AutoRefresh } from '@/components/auto-refresh';
import { ChatThread } from '@/components/chat-thread';
import { DraftEditor } from '@/components/draft-editor';
import { RepAvatar } from '@/components/rep-avatar';
import { TagBadge } from '@/components/tag-badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { dayLabel } from '@/lib/dates';
import type { LeadDetail } from '@/lib/leads';
import type { MockRep } from '@/lib/mock';
import { dueLabel } from '@/lib/queue';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export function LeadSheet({ detail, rep, today, closeHref }: { detail: LeadDetail; rep: MockRep | undefined; today: string; closeHref: string }) {
  const router = useRouter();
  const { lead, messages, analysis: a } = detail;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView(), [messages.length]);
  const close = () => router.push(closeHref, { scroll: false });
  const due = a ? dueLabel(a.next_followup_date, today) : null;
  const analyzing = a?.status === 'analyzing';

  return (
    <Sheet open onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-[560px]">
        {analyzing && <AutoRefresh />}
        <div className="flex flex-col gap-2 border-b p-4 pr-12">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{lead.name} · {lead.company}</SheetTitle>
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <button className="underline-offset-2 hover:underline" onClick={() => navigator.clipboard.writeText(lead.phone).then(() => toast.success('Phone copied'))}>{lead.phone}</button>
            {lead.city && <span>{lead.city}</span>}
            <span>{lead.source}</span>
            {rep && <RepAvatar rep={rep} size="sm" />}
            {a && <TagBadge tag={a.tag} score={a.score} />}
          </SheetDescription>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 p-4">
            {a ? (
              <>
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why {a.tag}</h3>
                  {analyzing ? <Skeleton className="h-5 w-full" /> : <p className="text-sm">{a.reason}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {a.points.map((p, i) => (
                      <span
                        key={i}
                        title={p.label}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-xs',
                          p.pts > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : p.pts < 0 ? 'border-red-200 bg-red-50 text-red-900' : 'border-zinc-200 bg-zinc-50 text-zinc-600',
                        )}
                      >
                        <b className="tabular-nums">{p.pts > 0 ? '+' : ''}{p.pts}</b> {p.label}
                      </span>
                    ))}
                  </div>
                </section>
                <section className="text-sm">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next follow-up</h3>
                  <span className={cn(due?.overdue && 'font-bold text-red-600')}>{dayLabel(a.next_followup_date)} · {due?.text}</span>
                </section>
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft message</h3>
                  {analyzing ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <DraftEditor
                      key={`${lead.id}:${a.draft_status}:${a.draft}:${a.pending_draft ?? ''}`}
                      leadId={lead.id}
                      firstName={lead.name.split(' ')[0]}
                      initial={a.draft}
                      pending={a.pending_draft}
                      onSent={close}
                    />
                  )}
                </section>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">This lead hasn&apos;t been analysed yet.</p>
            )}
            <Separator />
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chat</h3>
              <ChatThread messages={messages} notes={lead.notes} />
              <div ref={end} />
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
