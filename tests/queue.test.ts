import { describe, expect, it } from 'vitest';
import { buildQueue, dueLabel, handledAt, type ChatStamp, type QueueItem } from '../lib/queue';

const TODAY = '2026-10-24';
const rep = (sent_at: string): ChatStamp => ({ sender: 'rep', sent_at });
const buyer = (sent_at: string): ChatStamp => ({ sender: 'buyer', sent_at });
function item(id: string, tag: 'Hot' | 'Warm' | 'Cold', score: number, next: string, over: Partial<QueueItem> = {}, sentAt: string | null = null): QueueItem {
  return {
    id, name: id, company: 'Co', phone: '', city: null, source: 'Website', rep_id: 'rahul', product_interest: null,
    last_contact_date: '2026-10-20', recent: [],
    analysis: { tag, score, reason: '', next_followup_date: next, draft_status: sentAt ? 'sent' : 'pending', sent_at: sentAt, status: 'ready', error: null },
    ...over,
  };
}

describe('buildQueue', () => {
  it('buckets and sorts overdue by tag, days late, score', () => {
    const q = buildQueue([
      item('warm-old', 'Warm', 30, '2026-10-10'),
      item('hot-new', 'Hot', 60, '2026-10-23'),
      item('hot-old', 'Hot', 55, '2026-10-20'),
      item('hot-old-hi', 'Hot', 80, '2026-10-20'),
    ], TODAY, null);
    expect(q.overdue.map((i) => i.id)).toEqual(['hot-old-hi', 'hot-old', 'hot-new', 'warm-old']);
    expect(q.mostUrgentId).toBe('hot-old-hi');
  });

  it('splits due today, upcoming this week, later', () => {
    const q = buildQueue([
      item('t', 'Cold', 0, TODAY), item('w', 'Hot', 50, '2026-10-27'), item('l', 'Hot', 50, '2026-11-02'),
    ], TODAY, null);
    expect(q.dueToday.map((i) => i.id)).toEqual(['t']);
    expect(q.upcomingWeek.map((i) => i.id)).toEqual(['w']);
    expect(q.upcomingLater.map((i) => i.id)).toEqual(['l']);
  });

  it('puts a lead in Done today when the rep replied today, however the reply got in', () => {
    // No analysis.sent_at here: a reply added through Add chat counts just like Mark as sent.
    const replied = item('a', 'Warm', 30, '2026-10-20', { recent: [rep('2026-10-24T10:00:00+05:30'), buyer('2026-10-23T09:00:00+05:30')] });
    const q = buildQueue([replied], TODAY, null);
    expect(q.doneToday.map((i) => i.id)).toEqual(['a']);
    expect(q.overdue).toHaveLength(0);
    expect(q.stats.sentToday).toBe(1);
  });

  it('sends a lead back to the queue when the buyer replies after us the same day', () => {
    const back = item('a', 'Hot', 60, TODAY, { recent: [buyer('2026-10-24T15:00:00+05:30'), rep('2026-10-24T10:00:00+05:30')] }, '2026-10-24T04:30:00.000Z');
    const q = buildQueue([back], TODAY, null);
    expect(q.doneToday).toHaveLength(0);
    expect(q.dueToday.map((i) => i.id)).toEqual(['a']);
  });

  it('orders Done today by the latest reply, newest first', () => {
    const q = buildQueue([
      item('early', 'Hot', 60, '2026-10-25', { recent: [rep('2026-10-24T09:00:00+05:30')] }),
      item('late', 'Cold', 0, '2026-11-07', { recent: [rep('2026-10-24T18:00:00+05:30')] }),
    ], TODAY, null);
    expect(q.doneToday.map((i) => i.id)).toEqual(['late', 'early']);
  });

  it('filters by rep; Hot stat counts all Hot leads for that rep', () => {
    const q = buildQueue([
      item('a', 'Hot', 50, '2026-10-30'), item('b', 'Hot', 50, '2026-10-30', { rep_id: 'priya' }),
    ], TODAY, 'rahul');
    expect(q.stats.hot).toBe(1);
  });

  it('ignores leads with no analysis', () => {
    expect(buildQueue([item('a', 'Hot', 1, TODAY, { analysis: null })], TODAY, null).stats.dueToday).toBe(0);
  });
});

describe('dueLabel', () => {
  it('formats late, today and future', () => {
    expect(dueLabel('2026-10-22', TODAY)).toEqual({ text: '2 days late', overdue: true });
    expect(dueLabel('2026-10-23', TODAY)).toEqual({ text: '1 day late', overdue: true });
    expect(dueLabel(TODAY, TODAY)).toEqual({ text: 'Due today', overdue: false });
    expect(dueLabel('2026-10-27', TODAY)).toEqual({ text: 'Tue 27 Oct', overdue: false });
  });
});

describe('handledAt', () => {
  it('is the reply time when the newest message is ours and dated today (IST)', () => {
    expect(handledAt([buyer('2026-10-23T09:00:00+05:30'), rep('2026-10-24T10:00:00+05:30')], TODAY)).toBe('2026-10-24T10:00:00+05:30');
  });
  it('is null when our newest reply was yesterday', () => {
    expect(handledAt([rep('2026-10-23T22:00:00+05:30')], TODAY)).toBeNull();
  });
  it('is null when the buyer spoke last', () => {
    expect(handledAt([rep('2026-10-24T10:00:00+05:30'), buyer('2026-10-24T11:00:00+05:30')], TODAY)).toBeNull();
  });
  it('uses message time, not array order (older messages pasted after our reply)', () => {
    expect(handledAt([rep('2026-10-24T10:00:00+05:30'), buyer('2026-10-20T10:00:00+05:30')], TODAY)).toBe('2026-10-24T10:00:00+05:30');
  });
  it('does not count a same-minute tie with a buyer message', () => {
    expect(handledAt([rep('2026-10-24T10:00:00+05:30'), buyer('2026-10-24T10:00:00+05:30')], TODAY)).toBeNull();
  });
  it('is null with no messages', () => {
    expect(handledAt([], TODAY)).toBeNull();
  });
  it('follows the IST day boundary, not UTC', () => {
    // 23:30 IST on the 24th is 18:00 UTC on the 24th; 00:30 IST on the 25th is still the 24th in UTC.
    expect(handledAt([rep('2026-10-24T18:00:00Z')], TODAY)).toBe('2026-10-24T18:00:00Z');
    expect(handledAt([rep('2026-10-24T19:00:00Z')], TODAY)).toBeNull();
  });
});
