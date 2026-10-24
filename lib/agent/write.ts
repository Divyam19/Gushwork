import { z } from 'zod';
import { callStructured } from '../llm';
import type { Computed, Message, Signals, Tag } from '../schemas';
import { renderChat } from './prompts';

export const Written = z.object({ reason: z.string(), draft: z.string() });
export type Written = z.infer<typeof Written>;

export const WRITE_SYSTEM = `You are a sales assistant for PackRight Machines (packaging machines, B2B India). You write (1) a one-line reason for a lead's priority and (2) the rep's next WhatsApp message to the buyer.

reason: max 15 words, plain, cites the strongest signal. Example: "Asked final price for 2 units before Diwali - waiting on us 2 days."

draft rules:
- WhatsApp tone, 2-4 short lines, max 60 words. No subject line, no "Dear Sir/Madam", no emojis except at most one 🙏.
- Address the buyer the way the rep already does in the chat (Rajesh ji, Meena ma'am, Imran bhai). Default: first name + "ji".
- If language is hinglish, write natural Hinglish (Roman script) mixed with English, like the buyer.
- Answer the buyer's last open question first if they are waiting. Apologise briefly ("Sorry for the delay") only if they have waited more than 1 day.
- Reference specifics from the chat (model, quantity, deadline).
- End with exactly one clear ask (confirm a slot, share PO, quick call today at a time).
- Never invent prices, discounts, delivery dates, stock or specs that are not in the chat. If the reply needs one, put a placeholder in square brackets: [best price], [delivery date]. Prices that appear in the chat may be repeated.
- Cold + deferred/lost: short, polite, no pressure; one line of value; ask if it is ok to check back.
- If WE OWE the buyer something (a price, slot, document, callback), deliver it in the message now. Use a bracket placeholder for any figure or date not in the chat, e.g. "[best price]", "[trial slot date]". Never say "I'm checking" or "will revert" again.
- If the buyer asked for a price, delivery date, or availability and the chat does not state it, write the placeholder. Never promise delivery or stock yourself (wrong: "We can deliver before Diwali"; right: "Delivery before Diwali: [delivery date]").
- The reason must be factually accurate about who is waiting on whom. Say "waiting on us" ONLY when BUYER WAITING is true. If we owe something, say what. If the buyer deferred, say until when.
- Sign off with a new line containing only the rep's first name.`;

export interface WriteInput {
  lead: { name: string; company: string; product_interest: string | null; notes: string | null };
  repName: string;
  messages: Message[];
  signals: Signals;
  computed: Computed;
  tag: Tag;
  score: number;
  nextFollowup: string;
  today: string;
}

export async function writeReasonAndDraft(i: WriteInput, model?: string): Promise<Written> {
  const owed = i.signals.rep_promise_pending.value;
  const strongest = i.computed.points.map((p) => `${p.pts > 0 ? '+' : ''}${p.pts} ${p.label}`).join('; ');
  const user = `TODAY (IST): ${i.today}
REP: ${i.repName.split(' ')[0]}
LEAD: ${i.lead.name}, ${i.lead.company} | interest: ${i.lead.product_interest ?? '-'}
CRM NOTES: ${i.lead.notes ?? '-'}
TAG: ${i.tag} (score ${i.score}) | language: ${i.signals.language}
SCORE BREAKDOWN: ${strongest}
WE (THE REP) OWE THE BUYER: ${i.signals.rep_promise_pending.value ? `"${i.signals.rep_promise_pending.evidence}" - this was OUR promise, not the buyer's` : 'nothing'}
BUYER'S OPEN REQUEST: ${i.computed.buyer_waiting ? (i.signals.open_request.evidence ?? i.signals.buyer_waiting_no_chat.evidence ?? 'yes') : 'none'}
BUYER WAITING: ${i.computed.buyer_waiting} | DAYS SINCE LAST CONTACT: ${i.computed.days_since}
NEXT FOLLOW-UP: ${i.nextFollowup}

CHAT:
${renderChat(i.messages)}${owed ? '\n\nREQUIRED: the draft must DELIVER what we owe right now, with a [bracket placeholder] for the actual price/slot/date/document. Do not write "I will", "I\'m checking" or "let me confirm". The reason must say WE owe it (e.g. "We owe a trial slot - promised 8 days ago").' : ''}`;
  return callStructured({ schema: Written, name: 'written', system: WRITE_SYSTEM, user, model });
}
