import type { ExplicitHint, Signal, Signals } from '../lib/schemas';

const off: Signal = { value: false, evidence: null };
const on = (e = 'test'): Signal => ({ value: true, evidence: e });

type Keys = Exclude<keyof Signals, 'explicit_followup' | 'language'>;

export function sig(trueKeys: Keys[], explicit: ExplicitHint | null = null, language: Signals['language'] = 'english'): Signals {
  const base: Signals = {
    strong_intent: off, medium_intent: off, open_request: off, rep_promise_pending: off,
    time_pressure: off, price_objection_unresolved: off, deferred: off, lost: off,
    buyer_waiting_no_chat: off, ghosted_no_chat: off, explicit_followup: explicit, language,
  };
  for (const k of trueKeys) base[k] = on(k);
  return base;
}

// Hand-labelled signals that a correct extractor should produce.
export const LABELS: Record<string, Signals> = {
  L01: sig(['strong_intent', 'open_request', 'time_pressure'], null, 'hinglish'),
  L02: sig(['medium_intent']),
  L03: sig(['strong_intent', 'open_request']),
  L04: sig(['medium_intent', 'price_objection_unresolved']),
  L05: sig(['medium_intent'], { kind: 'weekday', value: 'monday', ref_date: '2026-10-20' }),
  L06: sig(['medium_intent', 'deferred'], { kind: 'month', value: 'january', ref_date: '2026-10-12' }),
  L07: sig(['medium_intent', 'open_request', 'rep_promise_pending', 'time_pressure', 'price_objection_unresolved']),
  L08: sig(['lost']),
  L09: sig(['strong_intent', 'open_request', 'time_pressure'], { kind: 'weekday', value: 'monday', ref_date: '2026-10-24' }),
  L10: sig(['strong_intent', 'rep_promise_pending']),
  L11: sig(['medium_intent'], null, 'hinglish'),
  L12: sig(['medium_intent', 'deferred'], { kind: 'month', value: 'november', ref_date: '2026-09-24' }),
  L15: sig(['medium_intent', 'deferred']),
  L16: sig(['strong_intent', 'buyer_waiting_no_chat']),
  L17: sig(['lost']),
  L23: sig(['medium_intent', 'ghosted_no_chat']),
};
