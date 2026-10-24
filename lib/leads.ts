import { db } from './db';
import type { MockRep } from './mock';
import type { QueueItem } from './queue';

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
