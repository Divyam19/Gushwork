'use client';

import { formatInTimeZone } from 'date-fns-tz';
import { CalendarClockIcon, CheckCircle2Icon, MapPinIcon, MessagesSquareIcon, PhoneIcon, SparklesIcon, TagIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AddChatDialog } from '@/components/add-chat-dialog';
import { AutoRefresh } from '@/components/auto-refresh';
import { ChatThread } from '@/components/chat-thread';
import { DraftEditor } from '@/components/draft-editor';
import { RepAvatar } from '@/components/rep-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { TZ, dayLabel, istDate } from '@/lib/dates';
import type { LeadDetail } from '@/lib/leads';
import type { MockRep } from '@/lib/mock';
import { dueLabel } from '@/lib/queue';
import type { Tag } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { TAG_THEME, initials } from '@/components/tag-theme';

// Display range for the heat gauge. Tag cut-offs (20 / 50) come from lib/agent/score.ts.
const MIN = -20;
const MAX = 80;
const pct = (v: number) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;

function HeatGauge({ score, tag, points }: { score: number; tag: Tag; points: { label: string; pts: number }[] }) {
  const warmAt = pct(20);
  const hotAt = pct(50);
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-col gap-1.5 select-none [&::-webkit-details-marker]:hidden">
        <div className="relative h-2 rounded-full bg-gradient-to-r from-slate-300 via-amber-300 to-rose-500">
          <span className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/80" style={{ left: `${warmAt}%` }} />
          <span className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/80" style={{ left: `${hotAt}%` }} />
          <motion.span
            className={cn('absolute top-1/2 flex size-6 items-center justify-center rounded-full text-[10px] font-bold tabular-nums shadow-md ring-2 ring-white', TAG_THEME[tag].pill)}
            style={{ x: '-50%', y: '-50%' }}
            initial={{ left: '0%', scale: 0.6 }}
            animate={{ left: `${Math.min(97, Math.max(3, pct(score)))}%`, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.25, duration: 1.1, delay: 0.25 }}
          >
            {score}
          </motion.span>
        </div>
        <div className="relative h-4 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          <span className="absolute left-0">Cold</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${(warmAt + hotAt) / 2}%` }}>Warm</span>
          <span className="absolute right-0">Hot</span>
        </div>
        <span className="text-xs font-medium text-zinc-600 group-open:hidden">How was this scored? ›</span>
      </summary>
      <ul className="reveal mt-1 flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white/80 text-sm">
        {points.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className="truncate text-zinc-700" title={p.label}>{p.label}</span>
            <span className={cn('shrink-0 font-semibold tabular-nums', p.pts > 0 ? 'text-emerald-600' : 'text-zinc-400')}>
              {p.pts > 0 ? '+' : ''}{p.pts}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between px-3 py-1.5 font-semibold text-zinc-900">
          <span>Total</span>
          <span className="tabular-nums">{score}</span>
        </li>
      </ul>
    </details>
  );
}

function Step({ n, icon, title, aside, className, children }: { n: number; icon: ReactNode; title: string; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section
      style={{ '--i': n, '--d': '180ms' } as React.CSSProperties}
      className={cn('anim-rise relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 shadow-xs', className)}
    >
      <header className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">{n}</span>
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600 [&_svg]:size-3.5">{icon}{title}</span>
        {aside && <span className="ml-auto">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

export function LeadSheet({ detail, rep, today, closeHref }: { detail: LeadDetail; rep: MockRep | undefined; today: string; closeHref: string }) {
  const router = useRouter();
  const { lead, messages, analysis: a } = detail;
  const end = useRef<HTMLDivElement>(null);
  const seen = useRef(messages.length);
  // Open at the top (the action); only follow the chat when new messages arrive.
  useEffect(() => {
    if (messages.length > seen.current) end.current?.scrollIntoView({ behavior: 'smooth' });
    seen.current = messages.length;
  }, [messages.length]);
  // Mount closed, then open on the next frame: a sheet that mounts already open never plays its slide-in.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const close = () => setOpen(false);
  const due = a ? dueLabel(a.next_followup_date, today) : null;
  const analyzing = a?.status === 'analyzing';
  const sentToday = !!a?.sent_at && istDate(a.sent_at) === today;
  const theme = a ? TAG_THEME[a.tag] : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()} onOpenChangeComplete={(o) => !o && router.push(closeHref, { scroll: false })}>
      <SheetContent className="w-full gap-0 bg-zinc-50 p-0 data-[side=right]:sm:max-w-[560px]">
        {analyzing && <AutoRefresh />}

        <div className={cn('anim-fade flex flex-col gap-4 border-b bg-gradient-to-b p-5 pr-12', theme?.hero ?? 'from-zinc-100 to-white')}>
          <div className="flex items-center gap-3">
            <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold shadow-sm', theme?.avatar ?? 'bg-zinc-200 text-zinc-700')}>
              {initials(lead.name)}
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg font-semibold leading-tight text-zinc-900">{lead.name}</SheetTitle>
              <p className="truncate text-sm text-zinc-600">{lead.company}</p>
            </div>
            {a && theme && (
              <span className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', theme.pill)}>{a.tag}</span>
                <span className="text-[10px] font-medium text-zinc-500">{theme.label}</span>
              </span>
            )}
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-700">
            <button
              className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-zinc-300"
              onClick={() => navigator.clipboard.writeText(lead.phone).then(() => toast.success('Phone copied'))}
              title="Copy phone"
            >
              <PhoneIcon className="size-3" /> {lead.phone}
            </button>
            {lead.city && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1 ring-1 ring-zinc-200">
                <MapPinIcon className="size-3" /> {lead.city}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1 ring-1 ring-zinc-200">
              <TagIcon className="size-3" /> {lead.source}
            </span>
            {rep && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 py-0.5 pl-0.5 pr-2.5 ring-1 ring-zinc-200">
                <RepAvatar rep={rep} size="sm" /> {rep.name.split(' ')[0]}
              </span>
            )}
          </SheetDescription>
          {a && !analyzing && <HeatGauge score={a.score} tag={a.tag} points={a.points} />}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-4">
            {a ? (
              <>
                <Step
                  n={1}
                  icon={<CalendarClockIcon />}
                  title="Why now"
                  className="border-zinc-200 bg-white pl-5"
                  aside={
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', due?.overdue ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-zinc-100 text-zinc-700')}>
                      {due?.text === dayLabel(a.next_followup_date) ? due.text : `${dayLabel(a.next_followup_date)} · ${due?.text}`}
                    </span>
                  }
                >
                  <span className={cn('absolute inset-y-0 left-0 w-1', theme?.rail)} />
                  {analyzing ? <Skeleton className="h-5 w-full" /> : <p className="text-[15px] font-medium leading-snug text-zinc-900">{a.reason}</p>}
                </Step>

                {sentToday ? (
                  <Step n={2} icon={<CheckCircle2Icon />} title="Sent" className="anim-pop border-emerald-200 bg-gradient-to-b from-emerald-50 to-white" aside={<span className="text-xs font-medium text-emerald-700">{formatInTimeZone(a.sent_at!, TZ, 'h:mm a')}</span>}>
                    <p className="text-sm font-medium text-emerald-900">Message sent and logged in the conversation below.</p>
                    <p className="text-xs text-zinc-500">Next follow-up: <b className="font-semibold text-zinc-700">{dayLabel(a.next_followup_date)}</b></p>
                    <details className="group">
                      <summary className="cursor-pointer list-none text-xs font-medium text-primary select-none hover:underline [&::-webkit-details-marker]:hidden">Write another message ›</summary>
                      <div className="mt-3">
                        {analyzing ? (
                          <Skeleton className="h-32 w-full" />
                        ) : (
                          <DraftEditor key={`${lead.id}:${a.draft_status}:${a.draft}:${a.pending_draft ?? ''}`} leadId={lead.id} firstName={lead.name.split(' ')[0]} initial={a.draft} pending={a.pending_draft} onSent={close} />
                        )}
                      </div>
                    </details>
                  </Step>
                ) : (
                  <Step n={2} icon={<SparklesIcon />} title="Send this" className="border-indigo-200 bg-gradient-to-b from-indigo-50 to-white">
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
                  </Step>
                )}
              </>
            ) : (
              <p className="rounded-2xl border border-dashed bg-white p-4 text-sm text-muted-foreground">This lead hasn&apos;t been analysed yet.</p>
            )}

            <Step
              n={a ? 3 : 1}
              icon={<MessagesSquareIcon />}
              title="Conversation"
              aside={messages.length > 0 && <span className="text-xs text-zinc-500">{messages.length} message{messages.length === 1 ? '' : 's'}</span>}
              className="border-[#e6dfd3] bg-[#f6f1e9]"
            >
              <ChatThread messages={messages} notes={lead.notes} />
              <div ref={end} />
            </Step>
          </div>
        </ScrollArea>

        <div className="border-t bg-white p-3">
          <AddChatDialog leadId={lead.id} repFirstName={rep?.name.split(' ')[0] ?? ''} prevTag={a?.tag ?? null} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
