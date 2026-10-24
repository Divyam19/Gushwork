import { z } from 'zod';
import { analyzeLead } from '@/lib/agent/run';
import { db } from '@/lib/db';
import { appendMessages } from '@/lib/messages';
import { MessageInput } from '@/lib/schemas';

export const maxDuration = 30;

const Body = z.object({ messages: z.array(MessageInput).min(1).max(200) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? 'Invalid body' }, { status: 400 });
  const { data: lead } = await db().from('leads').select('id').eq('id', id).maybeSingle();
  if (!lead) return Response.json({ error: 'Not found' }, { status: 404 });

  const { error, newestSender } = await appendMessages(id, body.data.messages);
  if (error) return Response.json({ error }, { status: 500 });

  try {
    // The rep's own reply spends the current draft.
    const a = await analyzeLead(id, { draftConsumed: newestSender === 'rep' });
    return Response.json({ ok: true, tag: a.tag });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Analysis failed' }, { status: 502 });
  }
}
