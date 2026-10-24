import { Suspense } from 'react';
import { Header } from '@/components/header';
import { LeadList } from '@/components/lead-list';
import { StatsRow } from '@/components/stats-row';
import { Skeleton } from '@/components/ui/skeleton';
import { todayIST } from '@/lib/dates';
import { getQueueItems, getReps } from '@/lib/leads';
import { buildQueue } from '@/lib/queue';

async function Dashboard({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const sp = await searchParams;
  const repParam = typeof sp.rep === 'string' ? sp.rep : null;
  const [reps, items] = await Promise.all([getReps(), getQueueItems()]);
  const rep = reps.some((r) => r.id === repParam) ? repParam : null;
  const today = todayIST();
  const q = buildQueue(items, today, rep);

  return (
    <>
      <Header reps={reps} rep={rep} />
      <StatsRow stats={q.stats} />
      <LeadList q={q} ctx={{ reps, today, showRep: !rep, rest: rep ? `rep=${rep}` : '', mostUrgentId: q.mostUrgentId }} />
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
