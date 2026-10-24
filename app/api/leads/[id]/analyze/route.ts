import { analyzeLead } from '@/lib/agent/run';
import { effectiveStatus } from '@/lib/analysis-status';
import { db } from '@/lib/db';

export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const step = new URL(req.url).searchParams.get('step') === 'write' ? 'write' : 'full';
  // This route exists only to spend LLM calls, so allow one run per lead at a time. Internal callers
  // (send, add chat) skip this: a later run just overwrites an earlier one, and it has the newer chat.
  const { data: a } = await db().from('analyses').select('status,error,analyzed_at').eq('lead_id', id).maybeSingle();
  if (a && effectiveStatus(a).status === 'analyzing') {
    return Response.json({ error: 'Already analysing this lead, try again in a few seconds' }, { status: 409 });
  }
  try {
    await analyzeLead(id, { step });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Analysis failed' }, { status: 500 });
  }
}
