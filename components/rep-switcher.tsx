import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import type { MockRep } from '@/lib/mock';
import { cn } from '@/lib/utils';

export function RepSwitcher({ reps, selected }: { reps: MockRep[]; selected: string | null }) {
  const item = (active: boolean) =>
    cn(
      'flex h-7 items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
      active ? 'bg-white shadow-sm ring-1 ring-zinc-200' : 'opacity-55 grayscale-[40%] hover:opacity-100 hover:grayscale-0',
    );
  return (
    <nav aria-label="Switch rep" className="flex items-center gap-0.5 rounded-full bg-zinc-100 p-0.5">
      <Link href="/" aria-current={!selected} className={cn(item(!selected), 'px-3 text-xs font-semibold text-zinc-900')}>
        All
      </Link>
      {reps.map((r) => (
        <Link key={r.id} href={`/?rep=${r.id}`} title={r.name} aria-label={r.name} aria-current={selected === r.id} className={cn(item(selected === r.id), 'p-0.5')}>
          <RepAvatar rep={r} size="sm" />
        </Link>
      ))}
    </nav>
  );
}
