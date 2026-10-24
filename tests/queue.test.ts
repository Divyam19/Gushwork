import { describe, expect, it } from 'vitest';
import { buildQueue, dueLabel, type QueueItem } from '../lib/queue';

const TODAY = '2026-10-24';
function item(id: string, tag: 'Hot' | 'Warm' | 'Cold', score: number, next: string, over: Partial<QueueItem> = {}, sentAt: string | null = null): QueueItem {
  return {
    id, name: id, company: 'Co', phone: '', city: null, source: 'Website', rep_id: 'rahul', product_interest: null,
    last_contact_date: '2026-10-20',
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

  it('puts leads sent today in Done today, even if re-analysis reset the draft to pending', () => {
    const sent = '2026-10-24T05:00:00.000Z';
    const reset = item('a', 'Warm', 30, '2026-10-20', {}, sent);
    reset.analysis!.draft_status = 'pending';
    const q = buildQueue([reset], TODAY, null);
    expect(q.doneToday.map((i) => i.id)).toEqual(['a']);
    expect(q.overdue).toHaveLength(0);
    expect(q.stats.sentToday).toBe(1);
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
