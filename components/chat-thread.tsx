import { formatInTimeZone } from 'date-fns-tz';
import { TZ, dayLabel, istDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { LeadDetail } from '@/lib/leads';

export function ChatThread({ messages, notes }: { messages: LeadDetail['messages']; notes: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      {notes && (
        <div className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          <span className="font-semibold">CRM note · </span>
          {notes}
        </div>
      )}
      {messages.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No chat yet.</p>}
      {messages.map((m, idx) => {
        const day = istDate(m.sent_at);
        const sep = idx === 0 || day !== istDate(messages[idx - 1].sent_at);
        const rep = m.sender === 'rep';
        return (
          <div key={m.id} className="flex flex-col gap-2">
            {sep && <div className="my-1 text-center text-xs text-muted-foreground">{dayLabel(day)}</div>}
            <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm', rep ? 'self-end rounded-br-sm bg-emerald-100 text-emerald-950' : 'self-start rounded-bl-sm bg-zinc-100')}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{formatInTimeZone(m.sent_at, TZ, 'h:mm a')}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
