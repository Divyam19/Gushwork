import { describe, expect, it } from 'vitest';
import { MessageInput } from '../lib/schemas';

describe('MessageInput', () => {
  it('accepts a message with no time (defaults to now) or a past time', () => {
    expect(MessageInput.safeParse({ sender: 'rep', text: 'hi' }).success).toBe(true);
    expect(MessageInput.safeParse({ sender: 'rep', text: 'hi', sent_at: '2026-01-01T10:00:00+05:30' }).success).toBe(true);
  });
  it('rejects a future-dated message, which would otherwise count as the newest', () => {
    const r = MessageInput.safeParse({ sender: 'buyer', text: 'hi', sent_at: new Date(Date.now() + 3_600_000).toISOString() });
    expect(r.success).toBe(false);
  });
});
