import { db } from './db';
import type { QueueItem } from './queue';
import { effectiveStatus } from './analysis-status';
import type { AnalysisRow, Rep, Sender } from './schemas';

function withEffectiveStatus<T extends { status: AnalysisRow['status']; error: string | null; analyzed_at: string | null }>(a: T): T {
  return { ...a, ...effectiveStatus(a) };
}

export async function getReps(): Promise<Rep[]> {
  const { data, error } = await db().from('reps').select('*').order('name');
  if (error) throw error;
  return data as Rep[];
}

export async function getQueueItems(): Promise<QueueItem[]> {
  const { data, error } = await db()
    .from('leads')
    .select(
      'id,name,company,phone,city,source,rep_id,product_interest,last_contact_date,' +
        'analyses(tag,score,reason,next_followup_date,draft_status,sent_at,status,error,analyzed_at)',
    );
  if (error) throw error;
  type Row = Omit<QueueItem, 'analysis'> & { analyses: (QueueItem['analysis'] & { analyzed_at: string | null }) | (QueueItem['analysis'] & { analyzed_at: string | null })[] | null };
  return (data as unknown as Row[]).map(({ analyses, ...l }) => {
    const a = Array.isArray(analyses) ? analyses[0] : analyses;
    return { ...l, analysis: a ? withEffectiveStatus(a) : null };
  });
}

export interface LeadDetail {
  lead: {
    id: string; name: string; company: string; phone: string; city: string | null; source: string;
    rep_id: string; product_interest: string | null; notes: string | null; last_contact_date: string;
  };
  messages: { id: string; sender: Sender; text: string; sent_at: string }[];
  analysis: (Omit<AnalysisRow, 'analyzed_at'> & { points: { label: string; pts: number }[] }) | null;
}

export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const sb = db();
  const [{ data: lead }, { data: messages }, { data: a }] = await Promise.all([
    sb.from('leads').select('*').eq('id', id).maybeSingle(),
    sb.from('messages').select('id,sender,text,sent_at').eq('lead_id', id).order('sent_at'),
    sb.from('analyses').select('*').eq('lead_id', id).maybeSingle(),
  ]);
  if (!lead) return null;
  return {
    lead,
    messages: messages ?? [],
    analysis: a
      ? {
          tag: a.tag, score: a.score, reason: a.reason, next_followup_date: a.next_followup_date, draft: a.draft,
          draft_status: a.draft_status, sent_at: a.sent_at, pending_draft: a.pending_draft, ...effectiveStatus(a),
          points: a.signals?.computed?.points ?? [],
        }
      : null,
  };
}
