'use client';

import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { MockRep } from '@/lib/mock';
import { parseWhatsApp } from '@/lib/whatsapp-parser';

const SOURCES = ['IndiaMART', 'Website', 'Trade Show', 'Referral', 'Cold Call', 'WhatsApp'];
export const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function AddLeadDialog({ reps, rep }: { reps: MockRep[]; rep: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [repId, setRepId] = useState(rep ?? reps[0]?.id ?? '');
  const [chat, setChat] = useState('');
  const repFirst = reps.find((r) => r.id === repId)?.name.split(' ')[0] ?? '';
  const parsed = useMemo(() => parseWhatsApp(chat, repFirst), [chat, repFirst]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? '').trim();
    setBusy(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: v('name'), company: v('company'), phone: v('phone'), city: v('city') || undefined,
          source: v('source'), rep_id: repId, product_interest: v('product_interest') || undefined,
          notes: v('notes') || undefined, messages: parsed.messages,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (data.id) {
        if (!res.ok) toast.error(`Lead saved, but analysis failed: ${data.error}`);
        else toast.success(`${v('name')} added and analysed`);
        setOpen(false);
        setChat('');
        router.push(`/?${rep ? `rep=${rep}&` : ''}lead=${data.id}`);
        router.refresh();
      } else {
        toast.error(data.error ?? 'Could not add lead');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> Add lead
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>The agent will tag it and draft a follow-up.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Name *"><Input name="name" required /></Field>
          <Field label="Company *"><Input name="company" required /></Field>
          <Field label="Phone *"><Input name="phone" required inputMode="tel" /></Field>
          <Field label="Source *">
            <select name="source" required className={selectClass} defaultValue="Website">
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Rep *">
            <select value={repId} onChange={(e) => setRepId(e.target.value)} className={selectClass}>
              {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <details className="col-span-2 group">
            <summary className="cursor-pointer select-none text-sm font-medium text-primary">More details (optional)</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="City"><Input name="city" /></Field>
              <Field label="Product interest"><Input name="product_interest" /></Field>
              <div className="col-span-2"><Field label="Notes"><Input name="notes" /></Field></div>
            <div className="col-span-2">
              <Field label="Paste WhatsApp chat (optional)">
                <Textarea value={chat} onChange={(e) => setChat(e.target.value)} placeholder="12/10/25, 14:05 - Name: message" className="min-h-20 text-xs" />
              </Field>
              {chat.trim() && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {parsed.messages.length} message{parsed.messages.length === 1 ? '' : 's'} parsed
                  {parsed.skipped > 0 && ` · ${parsed.skipped} line${parsed.skipped === 1 ? '' : 's'} skipped`}
                </p>
              )}
            </div>
            </div>
          </details>
          <DialogFooter className="col-span-2">
            <Button type="submit" disabled={busy}>{busy ? 'Analysing…' : 'Add and analyse'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
