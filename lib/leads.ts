import { db } from './db';
import type { MockRep } from './mock';
import type { QueueItem } from './queue';
import type { Tag } from './schemas';

export async function getReps(): Promise<MockRep[]> {
  const { data, error } = await db().from('reps').select('*').order('name');
  if (error) throw error;
  return data as MockRep[];
}

export async function getQueueItems(): Promise<QueueItem[]> {
  const { data, error } = await db()
    .from('leads')
    .select(
      'id,name,company,phone,city,source,rep_id,product_interest,last_contact_date,' +
        'analyses(tag,score,reason,next_followup_date,draft_status,sent_at,status,error)',
    );
  if (error) throw error;
  return (data as unknown as (Omit<QueueItem, 'analysis'> & { analyses: unknown })[]).map(({ analyses, ...l }) => ({
    ...l,
    analysis: (Array.isArray(analyses) ? analyses[0] : analyses) ?? null,
  })) as QueueItem[];
}

export interface LeadDetail {
  lead: {
    id: string; name: string; company: string; phone: string; city: string | null; source: string;
    rep_id: string; product_interest: string | null; notes: string | null; last_contact_date: string;
  };
  messages: { id: string; sender: 'rep' | 'buyer'; text: string; sent_at: string }[];
  analysis: {
    tag: Tag; score: number; reason: string; next_followup_date: string; draft: string;
    draft_status: 'pending' | 'sent'; sent_at: string | null; pending_draft: string | null; status: 'ready' | 'analyzing' | 'error';
    error: string | null; points: { label: string; pts: number }[];
  } | null;
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
          draft_status: a.draft_status, sent_at: a.sent_at, pending_draft: a.pending_draft, status: a.status, error: a.error,
          points: a.signals?.computed?.points ?? [],
        }
      : null,
  };
}
