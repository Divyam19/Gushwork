import { describe, expect, it } from 'vitest';
import { parseWhatsApp } from '@/lib/whatsapp-parser';

describe('parseWhatsApp', () => {
  it('parses dash format and assigns senders', () => {
    const r = parseWhatsApp('12/10/25, 14:05 - Rajesh Kumar: Price kya hai?\n12/10/25, 14:20 - Rahul Sharma: Rs 3.2L', 'Rahul');
    expect(r.messages).toEqual([
      { sender: 'buyer', text: 'Price kya hai?', sent_at: '2025-10-12T14:05:00+05:30' },
      { sender: 'rep', text: 'Rs 3.2L', sent_at: '2025-10-12T14:20:00+05:30' },
    ]);
  });

  it('parses bracket format with seconds and 4-digit year', () => {
    const r = parseWhatsApp('[1/2/2026, 09:03:07] Priya: Hello', 'Priya');
    expect(r.messages[0]).toEqual({ sender: 'rep', text: 'Hello', sent_at: '2026-02-01T09:03:07+05:30' });
  });

  it('handles am/pm', () => {
    const r = parseWhatsApp('12/10/25, 12:05 am - A: x\n12/10/25, 1:30 pm - A: y', 'Z');
    expect(r.messages.map((m) => m.sent_at)).toEqual(['2025-10-12T00:05:00+05:30', '2025-10-12T13:30:00+05:30']);
  });

  it('appends continuation lines and skips system lines', () => {
    const r = parseWhatsApp(
      '12/10/25, 14:05 - Messages are end-to-end encrypted.\n12/10/25, 14:06 - Buyer: line one\nline two\n12/10/25, 14:07 - Buyer: <Media omitted>',
      'Rahul',
    );
    expect(r.messages).toHaveLength(1);
    expect(r.messages[0].text).toBe('line one\nline two');
    expect(r.skipped).toBe(2);
  });

  it('returns nothing for plain text', () => {
    expect(parseWhatsApp('hello there', 'Rahul').messages).toHaveLength(0);
  });
});
