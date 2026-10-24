import { db } from './db';
import { istDate } from './dates';
import type { MessageInput, Sender } from './schemas';

/** Fill in `sent_at` (default: now) and attach the lead id, ready to insert into `messages`. */
export function toMessageRows(leadId: string, msgs: MessageInput[], now = new Date().toISOString()) {
  return msgs.map((m) => ({ lead_id: leadId, sender: m.sender, text: m.text, sent_at: m.sent_at ?? now }));
}

export const latestSentAt = (rows: { sent_at: string }[]) => rows.map((r) => r.sent_at).sort().at(-1);

/**
 * Insert messages for an existing lead and bump its last contact date. Returns an error message (or null)
 * and who sent the newest of the added messages.
 */
export async function appendMessages(leadId: string, msgs: MessageInput[]): Promise<{ error: string | null; newestSender: Sender | null }> {
  const sb = db();
  const rows = toMessageRows(leadId, msgs);
  const newest = rows.reduce<(typeof rows)[number] | null>((n, r) => (!n || r.sent_at >= n.sent_at ? r : n), null);
  const { error } = await sb.from('messages').insert(rows);
  if (error) return { error: error.message, newestSender: null };
  const { error: uErr } = await sb.from('leads').update({ last_contact_date: istDate(latestSentAt(rows)!) }).eq('id', leadId);
  return { error: uErr?.message ?? null, newestSender: newest?.sender ?? null };
}
