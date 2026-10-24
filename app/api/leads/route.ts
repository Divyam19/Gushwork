import { z } from 'zod';
import { analyzeLead } from '@/lib/agent/run';
import { db } from '@/lib/db';
import { istDate, todayIST } from '@/lib/dates';
import { latestSentAt, toMessageRows } from '@/lib/messages';
import { MessageInput } from '@/lib/schemas';

export const maxDuration = 30;

const Body = z.object({
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(5).max(30),
  city: z.string().trim().max(60).optional(),
  source: z.enum(['IndiaMART', 'Website', 'Trade Show', 'Referral', 'Cold Call', 'WhatsApp']),
  rep_id: z.string().min(1),
  product_interest: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  messages: z.array(MessageInput).max(200).default([]),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Invalid body' }, { status: 400 });
  const { messages, ...l } = body.data;
  const sb = db();

  const { data: rep } = await sb.from('reps').select('id').eq('id', l.rep_id).maybeSingle();
  if (!rep) return Response.json({ error: 'Unknown rep' }, { status: 400 });

  const id = `N${Date.now().toString(36).toUpperCase()}`;
  const rows = toMessageRows(id, messages);
  const last = latestSentAt(rows);
  const { error } = await sb.from('leads').insert({
    id,
    ...l,
    city: l.city || null,
    product_interest: l.product_interest || null,
    notes: l.notes || null,
    last_contact_date: last ? istDate(last) : todayIST(),
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (rows.length) {
    const { error: mErr } = await sb.from('messages').insert(rows);
    if (mErr) return Response.json({ error: mErr.message }, { status: 500 });
  }

  try {
    await analyzeLead(id);
    return Response.json({ ok: true, id });
  } catch (e) {
    return Response.json({ id, error: e instanceof Error ? e.message : 'Analysis failed' }, { status: 502 });
  }
}
