import { Suspense } from 'react';
import { Header } from '@/components/header';
import { LeadList } from '@/components/lead-list';
import { TodayHero } from '@/components/stats-row';
import { Skeleton } from '@/components/ui/skeleton';
import { greetingIST, longDateIST, todayIST } from '@/lib/dates';
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
  const who = reps.find((r) => r.id === rep)?.name.split(' ')[0];
  const greeting = `${greetingIST()}${who ? `, ${who}` : ''}`;
  const next = q.overdue[0] ?? q.dueToday[0] ?? null;

  return (
    <>
      <Header reps={reps} rep={rep} leads={items.map((i) => ({ id: i.id, name: i.name, company: i.company, phone: i.phone, tag: i.analysis?.tag ?? null }))} />
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6">
        <TodayHero
          stats={q.stats}
          date={longDateIST()}
          greeting={greeting}
          next={next}
          nextHref={next ? `/?${rest}${rest ? '&' : ''}lead=${next.id}` : null}
        />
        <LeadList q={q} ctx={{ reps, today, showRep: !rep, rest, mostUrgentId: q.mostUrgentId }} />
      </div>
      {items.some((i) => i.analysis?.status === 'analyzing') && <AutoRefresh />}
      {detail && <LeadSheet detail={detail} rep={reps.find((r) => r.id === detail.lead.rep_id)} today={today} closeHref={rest ? `/?${rest}` : '/'} />}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="h-[57px] border-b bg-white" />
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}

export default function Home({ searchParams }: PageProps<'/'>) {
  return (
    <main className="flex w-full flex-1 flex-col">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
