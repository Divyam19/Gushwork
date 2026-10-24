import { addDays, dayLabel, diffDays, istDate } from './dates';
import type { AnalysisRow, LeadRow, Tag } from './schemas';

export interface QueueItem extends Omit<LeadRow, 'notes'> {
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

/** Sent today (IST). Puts a lead in Done today and makes the sheet show its Sent card. */
export const isSentToday = (a: Pick<AnalysisRow, 'sent_at'> | null | undefined, today: string) =>
  !!a?.sent_at && istDate(a.sent_at) === today;

export function buildQueue(items: QueueItem[], today: string, rep: string | null): Queue {
  const scoped = items.filter((i): i is Analysed => !!i.analysis && (!rep || i.rep_id === rep));
  const sentToday = (i: Analysed) => isSentToday(i.analysis, today);
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
    doneToday: doneToday.sort((a, b) => b.analysis.sent_at!.localeCompare(a.analysis.sent_at!)),
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
