import { db } from '../db';
import { istDate, todayIST } from '../dates';
import { MODEL } from '../llm';
import type { Computed, Message, Signals, Tag } from '../schemas';
import { extractSignals } from './extract';
import type { LeadInput } from './prompts';
import { schedule } from './schedule';
import { score } from './score';
import { writeReasonAndDraft } from './write';

export interface AgentOutput {
  signals: Signals;
  tag: Tag;
  score: number;
  computed: Computed;
  next_followup_date: string;
  reason: string;
  draft: string;
}

export async function runAgent(
  lead: LeadInput & { id?: string },
  repName: string,
  messages: Message[],
  today: string,
  prior?: Signals,
): Promise<AgentOutput> {
  const signals = prior ?? (await extractSignals(lead, messages, today));
  const lastContact = lead.last_contact_date;
  const r = score({ signals, messages, lastContactDate: lastContact, today });
  const next = schedule({ signals, computed: r.computed, messages, lastContactDate: lastContact, tag: r.tag });
  const w = await writeReasonAndDraft({
    lead, repName, messages, signals, computed: r.computed, tag: r.tag, score: r.score, nextFollowup: next, today,
  });
  return { signals, tag: r.tag, score: r.score, computed: r.computed, next_followup_date: next, reason: w.reason, draft: w.draft };
}

export const lastContactOf = (messages: Message[], fallback: string) =>
  messages.length ? istDate(messages[messages.length - 1].sent_at) : fallback;

/** Re-analyse one lead from the DB. step 'write' re-runs only reason+draft using stored signals. */
export async function analyzeLead(leadId: string, opts: { step?: 'full' | 'write' } = {}) {
  const sb = db();
  const [{ data: lead }, { data: msgs }, { data: existing }] = await Promise.all([
    sb.from('leads').select('*, reps:rep_id(name)').eq('id', leadId).single(),
    sb.from('messages').select('sender,text,sent_at').eq('lead_id', leadId).order('sent_at'),
    sb.from('analyses').select('*').eq('lead_id', leadId).maybeSingle(),
  ]);
  if (!lead) throw new Error(`lead ${leadId} not found`);
  const messages = (msgs ?? []) as Message[];
  const input = { ...lead, last_contact_date: lastContactOf(messages, lead.last_contact_date) };
  const repName: string = lead.reps?.name ?? 'Team';

  // analyzed_at doubles as "started at" while analyzing, so a run killed at maxDuration can be detected as stale.
  if (existing) await sb.from('analyses').update({ status: 'analyzing', error: null, analyzed_at: new Date().toISOString() }).eq('lead_id', leadId);

  // No retry loop here: callStructured already retries each LLM call, and nesting them could exceed maxDuration.
  let out: AgentOutput;
  try {
    const prior = opts.step === 'write' && existing ? (existing.signals as Signals) : undefined;
    out = await runAgent(input, repName, messages, todayIST(), prior);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (existing) await sb.from('analyses').update({ status: 'error', error: msg }).eq('lead_id', leadId);
    throw e;
  }

  const wasEdited =
    opts.step !== 'write' &&
    existing?.draft_status === 'pending' &&
    existing.draft !== (existing.signals as { generated_draft?: string }).generated_draft;

  const row = {
    lead_id: leadId,
    tag: out.tag,
    score: out.score,
    signals: { ...out.signals, computed: out.computed, generated_draft: out.draft },
    reason: out.reason,
    next_followup_date: out.next_followup_date,
    draft: wasEdited ? existing!.draft : out.draft,
    pending_draft: wasEdited ? out.draft : null,
    draft_status: 'pending',
    status: 'ready',
    error: null,
    model: MODEL(),
    analyzed_at: new Date().toISOString(),
  };
  const { error } = await sb.from('analyses').upsert(row);
  if (error) throw error;
  return row;
}
