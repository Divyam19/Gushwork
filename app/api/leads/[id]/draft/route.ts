import { z } from 'zod';
import { db } from '@/lib/db';

const Body = z.object({ draft: z.string().max(5000).optional(), usePending: z.boolean().optional(), dismissPending: z.boolean().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Invalid body' }, { status: 400 });
  const sb = db();
  const { draft, usePending, dismissPending } = body.data;

  if (usePending || dismissPending) {
    const { data } = await sb.from('analyses').select('pending_draft,signals').eq('lead_id', id).maybeSingle();
    if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
    const patch = usePending && data.pending_draft ? { draft: data.pending_draft, pending_draft: null } : { pending_draft: null };
    const { error } = await sb.from('analyses').update(patch).eq('lead_id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, draft: patch.draft ?? null });
  }

  if (draft === undefined) return Response.json({ error: 'draft required' }, { status: 400 });
  const { error } = await sb.from('analyses').update({ draft }).eq('lead_id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
