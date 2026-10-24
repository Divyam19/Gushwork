import { describe, expect, it } from 'vitest';
import { STALE_ANALYZING_MS, effectiveStatus } from '../lib/analysis-status';

const now = Date.parse('2026-10-24T10:00:00Z');
const at = (msAgo: number) => new Date(now - msAgo).toISOString();

describe('effectiveStatus', () => {
  it('keeps a recent analyzing row as analyzing', () => {
    expect(effectiveStatus({ status: 'analyzing', error: null, analyzed_at: at(5_000) }, now).status).toBe('analyzing');
  });
  it('turns a stale analyzing row into an error so the UI stops polling', () => {
    const r = effectiveStatus({ status: 'analyzing', error: null, analyzed_at: at(STALE_ANALYZING_MS + 1) }, now);
    expect(r.status).toBe('error');
    expect(r.error).toMatch(/timed out/i);
  });
  it('treats analyzing with no timestamp as stale', () => {
    expect(effectiveStatus({ status: 'analyzing', error: null, analyzed_at: null }, now).status).toBe('error');
  });
  it('passes ready and error rows through untouched', () => {
    expect(effectiveStatus({ status: 'ready', error: null, analyzed_at: at(10 * STALE_ANALYZING_MS) }, now)).toEqual({ status: 'ready', error: null });
    expect(effectiveStatus({ status: 'error', error: 'boom', analyzed_at: null }, now)).toEqual({ status: 'error', error: 'boom' });
  });
});
