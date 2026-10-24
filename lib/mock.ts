import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Message } from './schemas';

const DIR = path.join(process.cwd(), 'mock-data');

export interface MockLead {
  id: string; name: string; company: string; phone: string; city: string;
  source: string; rep_id: string; product_interest: string;
  last_contact_date: string; notes: string;
}
export interface MockRep { id: string; name: string; initials: string; color: string }
export interface Expected { lead_id: string; tag: 'Hot' | 'Warm' | 'Cold'; why: string; next_followup_date?: string }

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function loadMock() {
  const reps: MockRep[] = JSON.parse(readFileSync(path.join(DIR, 'reps.json'), 'utf8'));
  const [head, ...rest] = parseCsv(readFileSync(path.join(DIR, 'leads.csv'), 'utf8'));
  const leads: MockLead[] = rest
    .filter((r) => r.length > 1)
    .map((r) => {
      const o = Object.fromEntries(head.map((h, i) => [h, r[i]]));
      return { ...o, id: o.lead_id, rep_id: o.assigned_rep } as unknown as MockLead;
    });
  const chatsRaw: { lead_id: string; messages: Message[] }[] = JSON.parse(
    readFileSync(path.join(DIR, 'chats.json'), 'utf8'),
  );
  const chats = Object.fromEntries(chatsRaw.map((c) => [c.lead_id, c.messages]));
  const expectedFile = JSON.parse(readFileSync(path.join(DIR, 'expected_tags.json'), 'utf8'));
  const expected: Expected[] = expectedFile.expected;
  return { reps, leads, chats, expected, anchor: expectedFile.anchor_date as string };
}
