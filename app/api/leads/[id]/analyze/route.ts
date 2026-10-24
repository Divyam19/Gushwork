import { analyzeLead } from '@/lib/agent/run';

export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const step = new URL(req.url).searchParams.get('step') === 'write' ? 'write' : 'full';
  try {
    await analyzeLead(id, { step });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Analysis failed' }, { status: 500 });
  }
}
