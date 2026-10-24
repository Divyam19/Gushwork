import { Suspense } from 'react';
import { Header } from '@/components/header';
import { LeadTable } from '@/components/lead-list';
import { Skeleton } from '@/components/ui/skeleton';
import { RepChips } from '@/components/rep-switcher';
import { ViewNav } from '@/components/view-nav';
import { VIEWS, viewCount, type ViewId } from '@/components/views';
import { greetingIST, longDateIST, todayIST } from '@/lib/dates';
import { AutoRefresh } from '@/components/auto-refresh';
import { LeadSheet } from '@/components/lead-sheet';
import { getLeadDetail, getQueueItems, getReps } from '@/lib/leads';
import { buildQueue } from '@/lib/queue';

const HINT: Record<ViewId, string> = {
  overdue: 'Hottest first, then most late',
  today: 'Hottest first',
  upcoming: 'Soonest first',
  done: 'Sent today, newest first',
};

async function Dashboard({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const sp = await searchParams;
  const repParam = typeof sp.rep === 'string' ? sp.rep : null;
  const [reps, items] = await Promise.all([getReps(), getQueueItems()]);
  const rep = reps.some((r) => r.id === repParam) ? repParam : null;
  const today = todayIST();
  const q = buildQueue(items, today, rep);
  const viewParam = VIEWS.find((v) => v.id === sp.view)?.id ?? null;
  const view: ViewId = viewParam ?? (q.overdue.length ? 'overdue' : 'today');
  const leadParam = typeof sp.lead === 'string' ? sp.lead : null;
  const detail = leadParam ? await getLeadDetail(leadParam) : null;
  const qs = (v: ViewId | null) => [rep && `rep=${rep}`, v && `view=${v}`].filter(Boolean).join('&');
  const rest = qs(viewParam);
  const who = reps.find((r) => r.id === rep)?.name.split(' ')[0];
  const meta = VIEWS.find((v) => v.id === view)!;

  return (
    <>
      <Header reps={reps} rep={rep} view={viewParam} rest={rest} leads={items.map((i) => ({ id: i.id, name: i.name, company: i.company, phone: i.phone, tag: i.analysis?.tag ?? null }))} />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[236px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
        <RepChips reps={reps} selected={rep} view={viewParam} />
        <ViewNav q={q} view={view} rep={reps.find((r) => r.id === rep)} allHref={viewParam ? `/?view=${viewParam}` : '/'} />
        <section className="flex min-h-0 flex-col gap-3 p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900">
                {meta.label}
                <span className={`rounded-full px-2 py-px text-xs font-semibold tabular-nums ${meta.badge}`}>{viewCount(q, view)}</span>
              </h1>
              <p className="text-xs text-zinc-500">{HINT[view]}</p>
            </div>
            <p className="hidden text-xs text-zinc-500 sm:block">{greetingIST()}{who ? `, ${who}` : ''} · {longDateIST()}</p>
          </div>
          <LeadTable q={q} view={view} ctx={{ reps, today, rest, mostUrgentId: q.mostUrgentId }} />
        </section>
      </div>
      {items.some((i) => i.analysis?.status === 'analyzing') && <AutoRefresh />}
      {detail && <LeadSheet key={detail.lead.id} detail={detail} rep={reps.find((r) => r.id === detail.lead.rep_id)} today={today} closeHref={rest ? `/?${rest}` : '/'} />}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="h-[53px] shrink-0 border-b bg-white" />
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[236px_minmax(0,1fr)]">
        <div className="hidden flex-col gap-2 border-r p-4 md:flex">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
        </div>
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </>
  );
}

export default function Home({ searchParams }: PageProps<'/'>) {
  return (
    <main className="flex w-full flex-1 flex-col md:h-dvh md:min-h-0 md:flex-none md:overflow-hidden">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
