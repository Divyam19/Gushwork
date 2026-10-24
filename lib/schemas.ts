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
export type AnalysisStatus = 'ready' | 'analyzing' | 'error';
export type DraftStatus = 'pending' | 'sent';

export interface Rep { id: string; name: string; initials: string; color: string }

/** One row of `leads`. Views and the agent Pick from this. */
export interface LeadRow {
  id: string;
  name: string;
  company: string;
  phone: string;
  city: string | null;
  source: string;
  rep_id: string;
  product_interest: string | null;
  notes: string | null;
  last_contact_date: string;
}

/** One row of `analyses`, minus the heavy `signals` blob. Queue and detail views each Pick what they need. */
export interface AnalysisRow {
  tag: Tag;
  score: number;
  reason: string;
  next_followup_date: string;
  draft: string;
  draft_status: DraftStatus;
  sent_at: string | null;
  pending_draft: string | null;
  status: AnalysisStatus;
  error: string | null;
  analyzed_at: string | null;
}

/** One message in a request body. `sent_at` defaults to now. Shared by every route that accepts chat. */
export const MessageInput = z.object({
  sender: z.enum(['rep', 'buyer']),
  text: z.string().min(1).max(4000),
  sent_at: z.iso
    .datetime({ offset: true })
    // A future-dated message would count as the newest one and hide the lead's real state.
    .refine((v) => Date.parse(v) <= Date.now() + 5 * 60_000, 'sent_at is in the future')
    .optional(),
});
export type MessageInput = z.infer<typeof MessageInput>;
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
