import { istDate } from '../dates';
import type { LeadRow, Message } from '../schemas';

export type LeadInput = Pick<LeadRow, 'name' | 'company' | 'source' | 'product_interest' | 'notes' | 'last_contact_date'>;

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
- strong_intent: buyer asked the final price for a stated quantity, asked for a proforma invoice / PO, asked for a demo / trial / sample test / factory visit, or asked for delivery timing for an order. For leads with no chat, a demo/trial/visit request in the CRM notes makes strong_intent true AND buyer_waiting_no_chat true.
- medium_intent: buyer asked specs, brochure, video, capacity or general price; OR is considering / discussing internally / comparing options. (Asking a price counts as medium.)
- open_request: the buyer's LAST message contains a question or request that WE (the rep) still need to answer or act on (e.g. "send price", "can I visit Monday?", "any update?", "send proforma"). Statements like "I'll discuss and revert", "will watch the video and tell you" / "video dekh ke batati hoon", "looks fine", "not now, call later", "thanks" are NOT open requests. If the buyer's last message contains ANY direct request to us ("please send the proforma", "send price", "any update?"), open_request is true even if the same message also says what the buyer will do next. If the last message is from REP, this is false.
- rep_promise_pending: the rep promised something (price, slot, document, callback) and no later message shows it was delivered.
- time_pressure: buyer mentioned a deadline or urgency: festival, launch date, "this week", "next week", "before Diwali".
- price_objection_unresolved: buyer said too expensive / competitor cheaper / budget tight AND a later message has not resolved it. If the rep offered a cheaper option and the buyer then reacted positively, it IS resolved (false).
- deferred: buyer explicitly pushed the purchase to a distant later time (next quarter, next year, after monsoon, "contact in January", "budget is tight right now"). HARD RULE: if the buyer says they will discuss with a partner / team / in a meeting and get back, deferred MUST be false (it is active consideration: medium_intent true). Only a stated far-off time or budget freeze counts.
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
Output: medium_intent true ("Send details."); deferred true ("Budget approval only next quarter, January"); open_request false (the buyer only asked us to contact later); explicit_followup {kind:"month", value:"january", ref_date:"2026-10-12"}; everything else false; language english.

Example 3 (buyer considering after a price objection was resolved; nothing for us to answer):
CHAT:
[2026-10-03 14:00 BUYER] Need a labelling machine for 200ml bottles.
[2026-10-03 14:20 REP] Hello Asha ji, PR-LB300 automatic, ₹3,90,000 + GST.
[2026-10-06 12:00 BUYER] Too expensive. Koi chhota option?
[2026-10-08 16:00 REP] Yes ji, semi-auto PR-LB100 at ₹1,65,000 + GST. Video: packright.in/v/lb100
[2026-10-09 19:30 BUYER] Yeh theek lag raha hai. Video dekh ke batati hoon.
Output: medium_intent true ("Need a labelling machine for 200ml bottles"); price_objection_unresolved false (the buyer reacted positively to the cheaper option); open_request false (the buyer will watch the video and reply); rep_promise_pending false; deferred false; strong_intent false; lost false; explicit_followup null; language hinglish.

Example 4 (buyer discussing internally, plus a trial request the rep has not yet delivered):
CHAT:
[2026-10-12 10:00 BUYER] Need a sealing machine for 500g pouches.
[2026-10-12 10:30 REP] PR-CBS770 is ₹68,000 + GST.
[2026-10-15 11:10 BUYER] Can you do a trial with our sample before we order?
[2026-10-15 11:25 REP] Sure ji, I will confirm a trial slot by tomorrow.
Output: medium_intent true ("Need a sealing machine for 500g pouches"); strong_intent true ("do a trial with our sample before we order"); rep_promise_pending true ("I will confirm a trial slot by tomorrow"); open_request false (last message is from the rep); deferred false; lost false; explicit_followup null; language english.

Example 5 (no chat, notes only):
LEAD: Amit, Saxena Pharma | source: Referral | interest: Shrink wrapping machine
CRM NOTES: Referred by an existing customer. Wants a live demo of the shrink wrapper at their plant.
CHAT: NO CHAT (this lead has CRM notes only).
Output: strong_intent true ("Wants a live demo of the shrink wrapper"); buyer_waiting_no_chat true ("Wants a live demo of the shrink wrapper"); medium_intent false; ghosted_no_chat false; deferred false; lost false; explicit_followup null.

Example 6 (buyer discussing internally, not deferred):
CHAT:
[2026-10-14 12:10 BUYER] We need a sealer for 1kg pouches. Price?
[2026-10-14 12:40 REP] PR-X1 is ₹68,000 + GST.
[2026-10-18 11:20 BUYER] Okay. Let me discuss with my partner and get back to you.
Output: medium_intent true ("We need a sealer for 1kg pouches"); deferred false; open_request false; lost false; explicit_followup null; language english.

Example 7 (last buyer message requests a document):
CHAT:
[2026-10-21 14:12 BUYER] Combo price is ok. Will you do installation?
[2026-10-21 14:30 REP] Yes, free installation is included.
[2026-10-23 17:50 BUYER] Good. Please send the proforma invoice, we will release the PO next week.
Output: strong_intent true ("Please send the proforma invoice"); open_request true ("Please send the proforma invoice"); time_pressure true ("release the PO next week"); deferred false; lost false; explicit_followup null; language english.`;
