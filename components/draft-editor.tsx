'use client';

import { CopyIcon, RefreshCwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PLACEHOLDER = /\[[^\]]+\]/g;

function PlaceholderChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
      <span>Fill in before sending:</span>
      {items.map((p, i) => <mark key={i} className="rounded bg-amber-200 px-1.5 py-0.5 text-amber-950">{p}</mark>)}
    </div>
  );
}

export function DraftEditor({
  leadId, firstName, initial, pending, onSent,
}: { leadId: string; firstName: string; initial: string; pending: string | null; onSent: () => void }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState<'send' | 'regen' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const found = text.match(PLACEHOLDER) ?? [];
  const placeholders = found.length;
  const blocked = placeholders > 0 || !text.trim();

  useEffect(() => () => clearTimeout(timer.current), []);

  function edit(v: string) {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api(`/api/leads/${leadId}/draft`, { method: 'PATCH', body: JSON.stringify({ draft: v }) }).catch(() => toast.error('Could not save draft'));
    }, 600);
  }

  async function send() {
    clearTimeout(timer.current);
    setBusy('send');
    try {
      await api(`/api/leads/${leadId}/send`, { method: 'POST', body: JSON.stringify({ draft: text }) });
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
      await api(`/api/leads/${leadId}/analyze?step=write`, { method: 'POST' });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not regenerate');
    } finally {
      setBusy(null);
    }
  }

  async function resolvePending(use: boolean) {
    try {
      await api(`/api/leads/${leadId}/draft`, { method: 'PATCH', body: JSON.stringify(use ? { usePending: true } : { dismissPending: true }) });
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
      <Textarea value={text} onChange={(e) => edit(e.target.value)} className="min-h-32 bg-white leading-relaxed" aria-label="Draft message" />
      {placeholders > 0 && <PlaceholderChips items={found} />}
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={blocked ? 0 : -1} className="max-sm:w-full" />}>
            <ShimmerButton
              type="button"
              disabled={blocked || busy !== null}
              onClick={send}
              background="#4f46e5"
              borderRadius="8px"
              className="h-9 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 max-sm:h-12 max-sm:w-full max-sm:text-base"
            >
              {busy === 'send' ? 'Sending…' : 'Mark as sent'}
            </ShimmerButton>
          </TooltipTrigger>
          {blocked && <TooltipContent>{text.trim() ? 'Fill the [placeholders] first' : 'Draft is empty'}</TooltipContent>}
        </Tooltip>
        <Button
          variant="outline"
          className="max-sm:h-11 max-sm:flex-1"
          onClick={() => navigator.clipboard.writeText(text).then(() => toast.success('Draft copied'), () => toast.error('Copy failed'))}
        >
          <CopyIcon /> Copy
        </Button>
        <Button variant="ghost" className="max-sm:h-11 max-sm:flex-1" disabled={busy !== null} onClick={regenerate}>
          <RefreshCwIcon className={busy === 'regen' ? 'animate-spin' : ''} /> {busy === 'regen' ? 'Regenerating…' : 'Regenerate'}
        </Button>
      </div>
    </div>
  );
}
