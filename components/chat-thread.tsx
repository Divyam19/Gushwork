'use client';

import { useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { TZ, dayLabel, istDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { LeadDetail } from '@/lib/leads';

export function ChatThread({ messages, notes }: { messages: LeadDetail['messages']; notes: string | null }) {
  const [all, setAll] = useState(false);
  const first = all ? 0 : Math.max(0, messages.length - 3);
  return (
    <div className="flex flex-col gap-2">
      {notes && (
        <div className="rounded-lg border border-dashed border-[#d9cfbf] bg-white/50 px-3 py-2 text-xs text-zinc-600">
          <span className="font-semibold">CRM note · </span>
          {notes}
        </div>
      )}
      {first > 0 && (
        <button onClick={() => setAll(true)} className="self-center text-xs font-medium text-primary hover:underline">
          Show {first} earlier message{first > 1 ? 's' : ''}
        </button>
      )}
      {messages.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No chat yet.</p>}
      {messages.map((m, idx) => {
        if (idx < first) return null;
        const day = istDate(m.sent_at);
        const sep = idx === first || day !== istDate(messages[idx - 1].sent_at);
        const rep = m.sender === 'rep';
        return (
          <div key={m.id} className="flex flex-col gap-2">
            {sep && <div className="my-1 self-center rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500 shadow-xs">{dayLabel(day)}</div>}
            <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm', rep ? 'self-end rounded-br-sm bg-[#d9fdd3] text-emerald-950 shadow-xs' : 'self-start rounded-bl-sm bg-white shadow-xs')}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{formatInTimeZone(m.sent_at, TZ, 'h:mm a')}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
