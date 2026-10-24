import { describe, expect, it } from 'vitest';
import { score } from '../lib/agent/score';
import { schedule } from '../lib/agent/schedule';
import { loadMock } from '../lib/mock';
import { LABELS } from './fixtures';

const { leads, chats, expected, anchor } = loadMock();

describe('rules engine vs expected_tags.json (hand-labelled signals)', () => {
  for (const e of expected) {
    it(`${e.lead_id} -> ${e.tag}${e.next_followup_date ? ' ' + e.next_followup_date : ''}`, () => {
      const lead = leads.find((l) => l.id === e.lead_id)!;
      const messages = chats[e.lead_id] ?? [];
      const signals = LABELS[e.lead_id];
      const lastContact = messages.length
        ? messages[messages.length - 1].sent_at.slice(0, 10)
        : lead.last_contact_date;
      const r = score({ signals, messages, lastContactDate: lastContact, today: anchor });
      expect(r.tag, `score=${r.score} ${JSON.stringify(r.computed.points)}`).toBe(e.tag);
      if (e.next_followup_date) {
        const d = schedule({ signals, computed: r.computed, messages, lastContactDate: lastContact, tag: r.tag });
        expect(d).toBe(e.next_followup_date);
      }
    });
  }
});
