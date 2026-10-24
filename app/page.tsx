import { Suspense } from 'react';
import { Header } from '@/components/header';
import { LeadList } from '@/components/lead-list';
import { StatsRow } from '@/components/stats-row';
import { Skeleton } from '@/components/ui/skeleton';
import { todayIST } from '@/lib/dates';
import { AutoRefresh } from '@/components/auto-refresh';
import { LeadSheet } from '@/components/lead-sheet';
import { getLeadDetail, getQueueItems, getReps } from '@/lib/leads';
import { buildQueue } from '@/lib/queue';

async function Dashboard({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const sp = await searchParams;
  const repParam = typeof sp.rep === 'string' ? sp.rep : null;
  const [reps, items] = await Promise.all([getReps(), getQueueItems()]);
  const rep = reps.some((r) => r.id === repParam) ? repParam : null;
  const today = todayIST();
  const q = buildQueue(items, today, rep);
  const leadParam = typeof sp.lead === 'string' ? sp.lead : null;
  const detail = leadParam ? await getLeadDetail(leadParam) : null;
  const rest = rep ? `rep=${rep}` : '';

  return (
    <>
      <Header reps={reps} rep={rep} leads={items.map((i) => ({ id: i.id, name: i.name, company: i.company, phone: i.phone, tag: i.analysis?.tag ?? null }))} />
      <StatsRow stats={q.stats} />
      <LeadList q={q} ctx={{ reps, today, showRep: !rep, rest, mostUrgentId: q.mostUrgentId }} />
      {items.some((i) => i.analysis?.status === 'analyzing') && <AutoRefresh />}
      {detail && <LeadSheet detail={detail} rep={reps.find((r) => r.id === detail.lead.rep_id)} today={today} closeHref={rest ? `/?${rest}` : '/'} />}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </>
  );
}

export default function Home({ searchParams }: PageProps<'/'>) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
