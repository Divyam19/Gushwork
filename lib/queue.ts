import { addDays, dayLabel, diffDays, istDate } from './dates';
import type { AnalysisRow, LeadRow, Sender, Tag } from './schemas';

export interface ChatStamp { sender: Sender; sent_at: string }

export interface QueueItem extends Omit<LeadRow, 'notes'> {
  /** The lead's newest few messages (any order). Enough to tell who spoke last. */
  recent: ChatStamp[];
  analysis: Pick<AnalysisRow, 'tag' | 'score' | 'reason' | 'next_followup_date' | 'draft_status' | 'sent_at' | 'status' | 'error'> | null;
}

export interface Queue {
  overdue: QueueItem[];
  dueToday: QueueItem[];
  upcomingWeek: QueueItem[];
  upcomingLater: QueueItem[];
  doneToday: QueueItem[];
  stats: { overdue: number; dueToday: number; hot: number; sentToday: number };
  mostUrgentId: string | null;
}

const TAG_RANK: Record<Tag, number> = { Hot: 0, Warm: 1, Cold: 2 };

type Analysed = QueueItem & { analysis: NonNullable<QueueItem['analysis']> };

/**
 * When the rep handled this lead today, else null. Handled = the newest message is the rep's and is dated
 * today (IST), however it got in (Mark as sent, Add chat, a pasted export). If a buyer message shares the
 * newest timestamp, the buyer may be waiting, so it does not count. Message time decides, not insert order.
 */
export function handledAt(messages: ChatStamp[], today: string): string | null {
  if (!messages.length) return null;
  const newest = Math.max(...messages.map((m) => Date.parse(m.sent_at)));
  const top = messages.filter((m) => Date.parse(m.sent_at) === newest);
  if (top.some((m) => m.sender === 'buyer')) return null;
  return istDate(top[0].sent_at) === today ? top[0].sent_at : null;
}

export function buildQueue(items: QueueItem[], today: string, rep: string | null): Queue {
  const scoped = items.filter((i): i is Analysed => !!i.analysis && (!rep || i.rep_id === rep));
  const handled = new Map(scoped.map((i) => [i.id, handledAt(i.recent, today)]));
  const sentToday = (i: Analysed) => handled.get(i.id) != null;
  const next = (i: Analysed) => i.analysis.next_followup_date;
  const byTag = (a: Analysed, b: Analysed) => TAG_RANK[a.analysis.tag] - TAG_RANK[b.analysis.tag];
  const byScore = (a: Analysed, b: Analysed) => b.analysis.score - a.analysis.score;

  const doneToday = scoped.filter(sentToday);
  const open = scoped.filter((i) => !sentToday(i));

  const overdue = open
    .filter((i) => next(i) < today)
    .sort((a, b) => byTag(a, b) || diffDays(next(a), next(b)) || byScore(a, b));
  const dueToday = open.filter((i) => next(i) === today).sort((a, b) => byTag(a, b) || byScore(a, b));
  const upcoming = open
    .filter((i) => next(i) > today)
    .sort((a, b) => next(a).localeCompare(next(b)) || byTag(a, b) || byScore(a, b));
  const horizon = addDays(today, 7);

  return {
    overdue,
    dueToday,
    upcomingWeek: upcoming.filter((i) => next(i) <= horizon),
    upcomingLater: upcoming.filter((i) => next(i) > horizon),
    doneToday: doneToday.sort((a, b) => Date.parse(handled.get(b.id)!) - Date.parse(handled.get(a.id)!)),
    stats: {
      overdue: overdue.length,
      dueToday: dueToday.length,
      hot: scoped.filter((i) => i.analysis.tag === 'Hot').length,
      sentToday: doneToday.length,
    },
    mostUrgentId: overdue[0]?.id ?? null,
  };
}

export function dueLabel(nextDate: string, today: string): { text: string; overdue: boolean } {
  const d = diffDays(today, nextDate);
  if (d > 0) return { text: `${d} ${d === 1 ? 'day' : 'days'} late`, overdue: true };
  if (d === 0) return { text: 'Due today', overdue: false };
  return { text: dayLabel(nextDate), overdue: false };
}
