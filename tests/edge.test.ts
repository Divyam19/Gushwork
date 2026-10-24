import { describe, expect, it } from 'vitest';
import { score } from '../lib/agent/score';
import { resolveHint, schedule } from '../lib/agent/schedule';
import { addDays, firstMondayOf, skipSunday, todayIST, weekday } from '../lib/dates';
import { sig } from './fixtures';

describe('dates', () => {
  it('IST today rolls over at 18:30 UTC', () => {
    expect(todayIST(new Date('2026-10-24T18:29:00Z'))).toBe('2026-10-24');
    expect(todayIST(new Date('2026-10-24T18:31:00Z'))).toBe('2026-10-25');
  });
  it('weekday and sunday skip', () => {
    expect(weekday('2026-10-24')).toBe(6);
    expect(skipSunday('2026-10-25')).toBe('2026-10-26');
    expect(skipSunday('2026-10-26')).toBe('2026-10-26');
  });
  it('first monday', () => {
    expect(firstMondayOf(2027, 1)).toBe('2027-01-04');
    expect(firstMondayOf(2026, 11)).toBe('2026-11-02');
  });
});

describe('resolveHint', () => {
  it('weekday = day after next such weekday', () => {
    expect(resolveHint({ kind: 'weekday', value: 'Monday', ref_date: '2026-10-20' })).toBe('2026-10-27');
  });
  it('same weekday as ref means next week', () => {
    expect(resolveHint({ kind: 'weekday', value: 'monday', ref_date: '2026-10-19' })).toBe('2026-10-27');
  });
  it('month in the past rolls to next year', () => {
    expect(resolveHint({ kind: 'month', value: 'march', ref_date: '2026-10-01' })).toBe('2027-03-01');
  });
  it('garbage returns null', () => {
    expect(resolveHint({ kind: 'weekday', value: 'someday', ref_date: '2026-10-01' })).toBeNull();
  });
});

describe('score', () => {
  const base = { messages: [], today: '2026-10-24' };
  it('recency boundaries', () => {
    const pts = (last: string) => score({ ...base, signals: sig([]), lastContactDate: last }).score;
    expect(pts('2026-10-21')).toBe(10); // 3d
    expect(pts('2026-10-20')).toBe(0); // 4d
    expect(pts('2026-10-14')).toBe(0); // 10d
    expect(pts('2026-10-13')).toBe(-5); // 11d
    expect(pts('2026-10-04')).toBe(-5); // 20d
    expect(pts('2026-10-03')).toBe(-20); // 21d
  });
  it('medium ignored when strong present', () => {
    expect(score({ ...base, signals: sig(['strong_intent', 'medium_intent']), lastContactDate: '2026-10-20' }).score).toBe(35);
  });
  it('lost is always Cold', () => {
    expect(score({ ...base, signals: sig(['lost', 'strong_intent', 'time_pressure']), lastContactDate: '2026-10-24' }).tag).toBe('Cold');
  });
  it('open_request without buyer last message is not waiting', () => {
    const r = score({
      signals: sig(['open_request']),
      messages: [{ sender: 'rep', text: 'x', sent_at: '2026-10-23T10:00:00+05:30' }],
      lastContactDate: '2026-10-23', today: '2026-10-24',
    });
    expect(r.computed.buyer_waiting).toBe(false);
  });
});

describe('schedule', () => {
  it('moves Sunday to Monday', () => {
    const s = sig([]);
    // Warm +3 from Fri 2026-10-23 = Mon... use Cold +14 from Sun-landing date
    const d = schedule({ signals: s, computed: { buyer_waiting: false }, messages: [], lastContactDate: '2026-10-11', tag: 'Warm' });
    expect(d).toBe('2026-10-14');
    const d2 = schedule({ signals: s, computed: { buyer_waiting: false }, messages: [], lastContactDate: '2026-10-22', tag: 'Warm' });
    expect(weekday(addDays('2026-10-22', 3))).toBe(0);
    expect(d2).toBe('2026-10-26');
  });
});
