import { z } from 'zod';
import { analyzeLead } from '@/lib/agent/run';
import { db } from '@/lib/db';
import { istDate } from '@/lib/dates';

export const maxDuration = 30;

const Body = z.object({
  messages: z.array(z.object({
    sender: z.enum(['rep', 'buyer']),
    text: z.string().min(1).max(4000),
    sent_at: z.iso.datetime({ offset: true }).optional(),
  })).min(1).max(200),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Invalid body' }, { status: 400 });
  const sb = db();
  const { data: lead } = await sb.from('leads').select('id').eq('id', id).maybeSingle();
  if (!lead) return Response.json({ error: 'Not found' }, { status: 404 });

  const now = new Date().toISOString();
  const rows = body.data.messages.map((m) => ({ lead_id: id, sender: m.sender, text: m.text, sent_at: m.sent_at ?? now }));
  const { error } = await sb.from('messages').insert(rows);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const last = rows.map((r) => r.sent_at).sort().at(-1)!;
  await sb.from('leads').update({ last_contact_date: istDate(last) }).eq('id', id);

  try {
    const a = await analyzeLead(id);
    return Response.json({ ok: true, tag: a.tag });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Analysis failed' }, { status: 502 });
  }
}
