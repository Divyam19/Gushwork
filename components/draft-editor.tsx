'use client';

import { CopyIcon, RefreshCwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PLACEHOLDER = /\[[^\]]+\]/g;

function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <p className="whitespace-pre-wrap rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
      {parts.map((p, i) =>
        /^\[[^\]]+\]$/.test(p) ? <mark key={i} className="rounded bg-amber-200 px-0.5 text-amber-950">{p}</mark> : <span key={i}>{p}</span>,
      )}
    </p>
  );
}

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Request failed');
  return res.json();
}

export function DraftEditor({
  leadId, firstName, initial, pending, onSent,
}: { leadId: string; firstName: string; initial: string; pending: string | null; onSent: () => void }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState<'send' | 'regen' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const placeholders = text.match(PLACEHOLDER)?.length ?? 0;
  const blocked = placeholders > 0 || !text.trim();

  useEffect(() => () => clearTimeout(timer.current), []);

  function edit(v: string) {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      call(`/api/leads/${leadId}/draft`, { method: 'PATCH', body: JSON.stringify({ draft: v }) }).catch(() => toast.error('Could not save draft'));
    }, 600);
  }

  async function send() {
    clearTimeout(timer.current);
    setBusy('send');
    try {
      await call(`/api/leads/${leadId}/send`, { method: 'POST', body: JSON.stringify({ draft: text }) });
      toast.success(`Sent to ${firstName} · logged in chat`);
      onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not mark as sent');
      setBusy(null);
    }
  }

  async function regenerate() {
    clearTimeout(timer.current);
    setBusy('regen');
    try {
      await call(`/api/leads/${leadId}/analyze?step=write`, { method: 'POST' });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not regenerate');
    } finally {
      setBusy(null);
    }
  }

  async function resolvePending(use: boolean) {
    try {
      await call(`/api/leads/${leadId}/draft`, { method: 'PATCH', body: JSON.stringify(use ? { usePending: true } : { dismissPending: true }) });
      router.refresh();
    } catch {
      toast.error('Could not update draft');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {pending && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          <span>New draft available after the latest chat. Your edited draft was kept.</span>
          <span className="flex shrink-0 gap-1">
            <Button size="xs" variant="outline" onClick={() => resolvePending(true)}>Use it</Button>
            <Button size="xs" variant="ghost" onClick={() => resolvePending(false)}>Dismiss</Button>
          </span>
        </div>
      )}
      <Textarea value={text} onChange={(e) => edit(e.target.value)} className="min-h-32 text-sm" aria-label="Draft message" />
      {placeholders > 0 && (
        <>
          <Highlighted text={text} />
          <p className="text-xs font-medium text-amber-700">Fill {placeholders} placeholder{placeholders > 1 ? 's' : ''} before sending</p>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={blocked ? 0 : -1} />}>
            <ShimmerButton
              type="button"
              disabled={blocked || busy !== null}
              onClick={send}
              background="#4f46e5"
              borderRadius="8px"
              className="h-9 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'send' ? 'Sending…' : 'Mark as sent'}
            </ShimmerButton>
          </TooltipTrigger>
          {blocked && <TooltipContent>{text.trim() ? 'Fill the [placeholders] first' : 'Draft is empty'}</TooltipContent>}
        </Tooltip>
        <Button
          variant="outline"
          onClick={() => navigator.clipboard.writeText(text).then(() => toast.success('Draft copied'), () => toast.error('Copy failed'))}
        >
          <CopyIcon /> Copy
        </Button>
        <Button variant="ghost" disabled={busy !== null} onClick={regenerate}>
          <RefreshCwIcon className={busy === 'regen' ? 'animate-spin' : ''} /> {busy === 'regen' ? 'Regenerating…' : 'Regenerate'}
        </Button>
      </div>
    </div>
  );
}
