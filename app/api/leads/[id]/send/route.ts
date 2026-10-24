import { z } from 'zod';
import { after } from 'next/server';
import { analyzeLead } from '@/lib/agent/run';
import { db } from '@/lib/db';
import { istDate } from '@/lib/dates';

export const maxDuration = 30;

const Body = z.object({ draft: z.string().min(1).max(5000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Invalid body' }, { status: 400 });
  const sb = db();
  const now = new Date();

  const { data: a } = await sb.from('analyses').select('lead_id').eq('lead_id', id).maybeSingle();
  if (!a) return Response.json({ error: 'Not found' }, { status: 404 });

  const { error: mErr } = await sb.from('messages').insert({ lead_id: id, sender: 'rep', text: body.data.draft, sent_at: now.toISOString() });
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });
  await Promise.all([
    sb.from('analyses').update({ draft: body.data.draft, draft_status: 'sent', sent_at: now.toISOString(), pending_draft: null }).eq('lead_id', id),
    sb.from('leads').update({ last_contact_date: istDate(now) }).eq('id', id),
  ]);

  after(() => analyzeLead(id).catch((e) => console.error('post-send analysis failed', id, e)));
  return Response.json({ ok: true });
}
