import { callStructured } from '../llm';
import { Signals, type Message } from '../schemas';
import { EXTRACT_SYSTEM, renderLead, type LeadInput } from './prompts';

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}₹]+/gu, ' ').trim();

const SIGNAL_KEYS = [
  'strong_intent', 'medium_intent', 'open_request', 'rep_promise_pending', 'time_pressure',
  'price_objection_unresolved', 'deferred', 'lost', 'buyer_waiting_no_chat', 'ghosted_no_chat',
] as const;

/** Drop any "true" signal whose evidence quote is not actually in the source text. */
export function verifyEvidence(signals: Signals, source: string, warn?: (m: string) => void): Signals {
  const hay = norm(source);
  const out = { ...signals };
  for (const k of SIGNAL_KEYS) {
    const s = out[k];
    if (!s.value) continue;
    if (!s.evidence || !hay.includes(norm(s.evidence))) {
      warn?.(`${k}: evidence not found in text -> "${s.evidence}"; set false`);
      out[k] = { value: false, evidence: null };
    }
  }
  return out;
}

export async function extractSignals(
  lead: LeadInput,
  messages: Message[],
  today: string,
  opts: { model?: string; warn?: (m: string) => void } = {},
): Promise<Signals> {
  const raw = await callStructured({
    schema: Signals,
    name: 'signals',
    system: EXTRACT_SYSTEM,
    user: renderLead(lead, messages, today),
    model: opts.model,
  });
  const source = [lead.notes ?? '', ...messages.map((m) => m.text)].join('\n');
  const checked = verifyEvidence(raw, source, opts.warn);
  if (messages.length) {
    checked.buyer_waiting_no_chat = { value: false, evidence: null };
    checked.ghosted_no_chat = { value: false, evidence: null };
  }
  return checked;
}
