'use client';

import { MessageSquarePlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api-client';
import type { Message } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { parseWhatsApp } from '@/lib/whatsapp-parser';

export function AddChatDialog({ leadId, repFirstName, prevTag }: { leadId: string; repFirstName: string; prevTag: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'paste' | 'single'>('paste');
  const [text, setText] = useState('');
  const [sender, setSender] = useState<'buyer' | 'rep'>('buyer');
  const parsed = useMemo(() => parseWhatsApp(text, repFirstName), [text, repFirstName]);
  const messages: Pick<Message, 'sender' | 'text'>[] & { sent_at?: string }[] =
    mode === 'paste' ? parsed.messages : text.trim() ? [{ sender, text: text.trim() }] : [];

  async function save() {
    setBusy(true);
    try {
      const data = await api<{ tag?: string }>(`/api/leads/${leadId}/messages`, { method: 'POST', body: JSON.stringify({ messages }) });
      toast.success(data.tag && prevTag && data.tag !== prevTag ? `Re-analysed: ${prevTag} → ${data.tag}` : 'Chat added · re-analysed');
      setOpen(false);
      setText('');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add chat');
    } finally {
      setBusy(false);
    }
  }

  const seg = (m: typeof mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={cn('rounded-md px-3 py-1 text-xs font-medium', mode === m ? 'bg-white shadow-xs' : 'text-muted-foreground')}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger render={<Button variant="outline" className="w-full max-sm:h-11" />}>
        <MessageSquarePlusIcon /> Add chat
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg max-sm:[&_input]:h-11 max-sm:[&_select]:h-11 max-sm:[&_textarea]:text-base max-sm:[&_summary]:py-2.5 max-sm:[&_button:not([data-slot=dialog-close])]:h-11">
        <DialogHeader>
          <DialogTitle>Add chat</DialogTitle>
          <DialogDescription>New messages trigger a fresh analysis.</DialogDescription>
        </DialogHeader>
        <div className="inline-flex w-fit gap-1 rounded-lg bg-zinc-100 p-1">
          {seg('paste', 'Paste export')}
          {seg('single', 'Single message')}
        </div>
        {mode === 'single' && (
          <div className="inline-flex w-fit gap-1 rounded-lg bg-zinc-100 p-1">
            {(['buyer', 'rep'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sender === s}
                onClick={() => setSender(s)}
                className={cn('rounded-md px-3 py-1 text-xs font-medium capitalize', sender === s ? 'bg-white shadow-xs' : 'text-muted-foreground')}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'paste' ? '12/10/25, 14:05 - Name: message' : 'Type the message'}
          className="min-h-28 text-sm"
          aria-label="Messages"
        />
        {mode === 'paste' && text.trim() && (
          <div className="max-h-40 overflow-y-auto rounded-lg bg-zinc-50 p-2 text-xs">
            {parsed.messages.length === 0 ? (
              <p className="text-amber-700">No messages recognised. Expected: dd/mm/yy, hh:mm - Name: text</p>
            ) : (
              parsed.messages.map((m, i) => (
                <p key={i} className="py-0.5">
                  <b className={m.sender === 'rep' ? 'text-emerald-700' : 'text-zinc-700'}>{m.sender === 'rep' ? 'Rep' : 'Buyer'}</b> · {m.sent_at.slice(0, 16).replace('T', ' ')} · {m.text}
                </p>
              ))
            )}
          </div>
        )}
        <DialogFooter>
          <Button onClick={save} disabled={busy || messages.length === 0}>
            {busy ? 'Analysing…' : `Save ${messages.length || ''} & re-analyse`.replace('  ', ' ')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
