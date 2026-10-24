import type { Message } from './schemas';

export interface ParseResult {
  messages: Message[];
  skipped: number;
}

// "12/10/25, 14:05 - Name: text" or "[12/10/25, 14:05:33] Name: text" (am/pm optional)
const LINE = /^‎?\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?\]?\s*(?:-\s*)?(.*)$/i;

const pad = (n: number | string) => String(n).padStart(2, '0');

/** Parses a WhatsApp export. Sender is 'rep' when the name starts with the rep's first name, else 'buyer'. Timestamps are IST. */
export function parseWhatsApp(text: string, repFirstName: string): ParseResult {
  const rep = repFirstName.trim().toLowerCase();
  const messages: Message[] = [];
  let skipped = 0;
  let open = false;

  for (const raw of text.split(/\r?\n/)) {
    const m = LINE.exec(raw);
    if (!m) {
      if (open && raw.trim()) messages[messages.length - 1].text += '\n' + raw.trim();
      else if (!open && raw.trim()) skipped++;
      continue;
    }
    const [, d, mo, yRaw, hRaw, min, sec, ap, rest] = m;
    const colon = rest.indexOf(': ');
    if (colon < 1) {
      skipped++; // system line, e.g. "Messages are end-to-end encrypted"
      open = false;
      continue;
    }
    const name = rest.slice(0, colon).trim();
    const body = rest.slice(colon + 2).trim();
    if (!body || /^<media omitted>$/i.test(body)) {
      skipped++;
      open = false;
      continue;
    }
    const year = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    let h = Number(hRaw);
    if (ap) h = (h % 12) + (ap.toLowerCase() === 'pm' ? 12 : 0);
    messages.push({
      sender: name.toLowerCase().startsWith(rep) && rep ? 'rep' : 'buyer',
      text: body,
      sent_at: `${year}-${pad(mo)}-${pad(d)}T${pad(h)}:${min}:${pad(sec ?? 0)}+05:30`,
    });
    open = true;
  }
  return { messages, skipped };
}
