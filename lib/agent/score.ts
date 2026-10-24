import { diffDays } from '../dates';
import type { Computed, Message, Signals, Tag } from '../schemas';

export interface ScoreInput {
  signals: Signals;
  messages: Message[];
  lastContactDate: string;
  today: string;
}

export interface ScoreResult {
  score: number;
  tag: Tag;
  computed: Computed;
}

export function computeFlags(i: ScoreInput) {
  const { signals: s, messages: m } = i;
  const last = m[m.length - 1];
  const hasChat = m.length > 0;
  const buyer_waiting = hasChat
    ? last.sender === 'buyer' && s.open_request.value
    : s.buyer_waiting_no_chat.value;
  const ghosting = hasChat
    ? m.length >= 2 && m[m.length - 1].sender === 'rep' && m[m.length - 2].sender === 'rep'
    : s.ghosted_no_chat.value;
  const days_since = diffDays(i.today, i.lastContactDate);
  return { buyer_waiting, ghosting, days_since };
}

function recency(days: number): { label: string; pts: number } {
  if (days <= 3) return { label: `Active ${days}d ago`, pts: 10 };
  if (days <= 10) return { label: `Last contact ${days}d ago`, pts: 0 };
  if (days <= 20) return { label: `Quiet ${days} days`, pts: -5 };
  return { label: `Silent ${days} days`, pts: -20 };
}

/** Tag cut-offs. The lead sheet's heat gauge draws its bands from these. */
export const WARM_AT = 20;
export const HOT_AT = 50;

export function score(i: ScoreInput): ScoreResult {
  const s = i.signals;
  const f = computeFlags(i);
  const points: { label: string; pts: number }[] = [];
  const add = (label: string, pts: number) => points.push({ label, pts });

  if (s.strong_intent.value) add(s.strong_intent.evidence ?? 'Strong buying intent', 35);
  else if (s.medium_intent.value) add(s.medium_intent.evidence ?? 'Interested', 25);
  if (f.buyer_waiting) add(`Waiting on us`, 20);
  if (s.rep_promise_pending.value) add(s.rep_promise_pending.evidence ?? 'We owe them something', 15);
  if (s.time_pressure.value) add(s.time_pressure.evidence ?? 'Has a deadline', 10);
  if (s.price_objection_unresolved.value) add(s.price_objection_unresolved.evidence ?? 'Price objection open', -10);
  if (f.ghosting) add('No reply to our follow-ups', -15);
  if (s.deferred.value) add(s.deferred.evidence ?? 'Pushed to later', -25);
  const r = recency(f.days_since);
  add(r.label, r.pts);

  const total = points.reduce((a, p) => a + p.pts, 0);
  const tag: Tag = s.lost.value ? 'Cold' : total >= HOT_AT ? 'Hot' : total >= WARM_AT ? 'Warm' : 'Cold';
  return { score: total, tag, computed: { ...f, points } };
}
