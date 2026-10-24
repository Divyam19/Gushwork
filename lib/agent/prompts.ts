import { istDate } from '../dates';
import type { Message } from '../schemas';

export interface LeadInput {
  name: string;
  company: string;
  source: string;
  product_interest: string | null;
  notes: string | null;
  last_contact_date: string;
}

export function renderChat(messages: Message[]): string {
  if (!messages.length) return 'NO CHAT (this lead has CRM notes only).';
  return messages
    .map((m) => {
      const t = new Date(m.sent_at);
      const hhmm = t.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      return `[${istDate(m.sent_at)} ${hhmm} ${m.sender.toUpperCase()}] ${m.text}`;
    })
    .join('\n');
}

export function renderLead(l: LeadInput, messages: Message[], today: string): string {
  return `TODAY (IST): ${today}
LEAD: ${l.name}, ${l.company} | source: ${l.source} | interest: ${l.product_interest ?? '-'}
CRM NOTES: ${l.notes ?? '-'}
LAST CONTACT DATE: ${l.last_contact_date}

CHAT:
${renderChat(messages)}`;
}

export const EXTRACT_SYSTEM = `You extract buying signals from a sales lead's WhatsApp chat and CRM notes for PackRight Machines (packaging machines, B2B India). Chats may be English or Hinglish.

Rules:
- Be literal. Mark a signal true only if the chat/notes clearly support it. When unsure, false.
- For every true signal, "evidence" is a short quote (max 12 words) copied EXACTLY from the chat or notes. For false signals evidence is null.
- Never decide Hot/Warm/Cold. Only extract signals.

Signals:
- strong_intent: buyer asked the final price for a stated quantity, asked for a proforma invoice / PO, asked for a demo / trial / factory visit, or asked for delivery timing for an order.
- medium_intent: buyer asked specs, brochure, video, capacity or general price; OR is considering / discussing internally / comparing options. (Asking a price counts as medium.)
- open_request: the buyer's LAST message contains a question or request that WE (the rep) still need to answer or act on (e.g. "send price", "can I visit Monday?", "any update?", "send proforma"). Statements like "I'll discuss and revert", "will watch the video and tell you", "not now, call later", "thanks" are NOT open requests. If the last message is from REP, this is false.
- rep_promise_pending: the rep promised something (price, slot, document, callback) and no later message shows it was delivered.
- time_pressure: buyer mentioned a deadline or urgency: festival, launch date, "this week", "next week", "before Diwali".
- price_objection_unresolved: buyer said too expensive / competitor cheaper / budget tight AND a later message has not resolved it. If the rep offered a cheaper option and the buyer then reacted positively, it IS resolved (false).
- deferred: buyer explicitly pushed to later (next quarter, next year, after monsoon, "contact in January", "budget is tight right now").
- lost: not interested / bought elsewhere / already have a vendor / asked not to contact.
- buyer_waiting_no_chat: ONLY for leads with NO CHAT: the notes show the buyer asked a question or made an enquiry that we haven't answered (e.g. "asked price", "wants a live demo", "asked for brochure"). For leads with a chat, always false.
- ghosted_no_chat: ONLY for leads with NO CHAT: notes show our calls/messages went unanswered (e.g. "no response to 3 calls"). For leads with a chat, always false.
- explicit_followup: only if the buyer named a future time ("Monday meeting", "January", "after monsoon, in November"). Return {kind, value, ref_date}: kind "weekday" with value the weekday name (e.g. "monday"), kind "month" with value the month name (e.g. "january"), or kind "date" with value YYYY-MM-DD for an exact date. ref_date is the YYYY-MM-DD date of the message that mentions it (for notes, the LAST CONTACT DATE). Do NOT compute dates yourself. Otherwise null.
- language: "hinglish" if the BUYER writes any Hindi words in Roman script (e.g. "dekha", "hai", "batao", "theek"), else "english".

Example 1 (lead with a rep promise and a waiting buyer):
CHAT:
[2026-10-17 10:10 BUYER] Hi, need a vacuum machine with nitrogen flushing for cashew tins and pouches.
[2026-10-17 10:50 REP] Hello Kavita ma'am, DZ-500 with N2 flushing is ₹3,45,000 + GST.
[2026-10-19 15:30 BUYER] Another supplier quoted ₹3,10,000 for a similar machine. Can you match?
[2026-10-19 16:00 REP] Let me check the best price with my manager and revert.
[2026-10-21 11:45 BUYER] Priya, any update? We need to finalise this week.
Output: medium_intent true ("need a vacuum machine with nitrogen flushing"); open_request true ("any update?"); rep_promise_pending true ("check the best price with my manager and revert"); time_pressure true ("We need to finalise this week"); price_objection_unresolved true ("Another supplier quoted ₹3,10,000"); strong_intent false; deferred false; lost false; explicit_followup null; language english.

Example 2 (deferred buyer, nothing for us to answer):
CHAT:
[2026-10-08 11:00 REP] Hello Suresh ji, Rahul from PackRight Machines. We make pallet stretch wrappers. Would you like details?
[2026-10-09 10:20 BUYER] Send details.
[2026-10-09 10:40 REP] Sure ji. PR-SW2000 semi-auto stretch wrapper, ₹3,10,000 + GST. Brochure attached.
[2026-10-12 18:05 BUYER] Thanks. Budget approval only next quarter, January. Contact then.
Output: medium_intent true ("Send details."); deferred true ("Budget approval only next quarter, January"); open_request false (the buyer only asked us to contact later); explicit_followup {kind:"month", value:"january", ref_date:"2026-10-12"}; everything else false; language english.`;
