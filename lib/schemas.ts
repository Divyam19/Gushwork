import { z } from 'zod';

export const Signal = z.object({ value: z.boolean(), evidence: z.string().nullable() });
export type Signal = z.infer<typeof Signal>;

export const ExplicitHint = z.object({
  kind: z.enum(['weekday', 'month', 'date']),
  value: z.string(), // weekday: "monday"; month: "january"; date: YYYY-MM-DD
  ref_date: z.string(), // YYYY-MM-DD of the message that mentions it
});
export type ExplicitHint = z.infer<typeof ExplicitHint>;

export const Signals = z.object({
  strong_intent: Signal,
  medium_intent: Signal,
  open_request: Signal, // buyer's last message asks us a question or requests something
  rep_promise_pending: Signal,
  time_pressure: Signal,
  price_objection_unresolved: Signal,
  deferred: Signal,
  lost: Signal,
  buyer_waiting_no_chat: Signal, // no-chat leads only
  ghosted_no_chat: Signal, // no-chat leads only: our calls/messages unanswered
  explicit_followup: ExplicitHint.nullable(),
  language: z.enum(['english', 'hinglish']),
});
export type Signals = z.infer<typeof Signals>;

export type Tag = 'Hot' | 'Warm' | 'Cold';
export type Sender = 'rep' | 'buyer';
export interface Message {
  sender: Sender;
  text: string;
  sent_at: string; // ISO timestamp
}

export interface Computed {
  buyer_waiting: boolean;
  ghosting: boolean;
  days_since: number;
  points: { label: string; pts: number }[];
}
