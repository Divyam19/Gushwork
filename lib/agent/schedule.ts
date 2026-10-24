import { addDays, firstMondayOf, skipSunday, weekday } from '../dates';
import { istDate } from '../dates';
import type { Computed, ExplicitHint, Message, Signals, Tag } from '../schemas';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export function resolveHint(h: ExplicitHint): string | null {
  const v = h.value.trim().toLowerCase();
  if (h.kind === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  if (h.kind === 'weekday') {
    const target = WEEKDAYS.indexOf(v);
    if (target < 0) return null;
    let d = addDays(h.ref_date, 1);
    while (weekday(d) !== target) d = addDays(d, 1);
    return addDays(d, 1); // day after that weekday
  }
  const m = MONTHS.indexOf(v) + 1;
  if (m < 1) return null;
  const refYear = Number(h.ref_date.slice(0, 4));
  let d = firstMondayOf(refYear, m);
  if (d <= h.ref_date) d = firstMondayOf(refYear + 1, m);
  return d;
}

export interface ScheduleInput {
  signals: Signals;
  computed: Pick<Computed, 'buyer_waiting'>;
  messages: Message[];
  lastContactDate: string;
  tag: Tag;
}

export function schedule(i: ScheduleInput): string {
  const { signals: s, messages: m } = i;
  const raw = pick();
  return skipSunday(raw);

  function pick(): string {
    if (!i.computed.buyer_waiting && s.explicit_followup) {
      const d = resolveHint(s.explicit_followup);
      if (d) return d;
    }
    if (s.lost.value) return addDays(i.lastContactDate, 90);
    if (i.computed.buyer_waiting) {
      if (m.length === 0) return i.lastContactDate;
      let k = m.length - 1;
      while (k > 0 && m[k - 1].sender === 'buyer') k--;
      return istDate(m[k].sent_at);
    }
    if (s.rep_promise_pending.value) {
      const lastRep = [...m].reverse().find((x) => x.sender === 'rep');
      if (lastRep) return addDays(istDate(lastRep.sent_at), 1);
    }
    const off = i.tag === 'Hot' ? 1 : i.tag === 'Warm' ? 3 : 14;
    return addDays(i.lastContactDate, off);
  }
}
