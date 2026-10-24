import { describe, expect, it } from 'vitest';
import { verifyEvidence } from '../lib/agent/extract';
import { sig } from './fixtures';

describe('verifyEvidence', () => {
  const src = 'Priya, any update? We need to finalise this week.';
  it('keeps signals whose quote is in the text (case/punctuation-insensitive)', () => {
    const s = sig([]);
    s.time_pressure = { value: true, evidence: 'we need to finalise this week' };
    expect(verifyEvidence(s, src).time_pressure.value).toBe(true);
  });
  it('drops signals with invented evidence', () => {
    const s = sig([]);
    s.strong_intent = { value: true, evidence: 'Please send the purchase order' };
    expect(verifyEvidence(s, src).strong_intent.value).toBe(false);
  });
});
