import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import type { MockRep } from '@/lib/mock';
import { cn } from '@/lib/utils';

export function RepSwitcher({ reps, selected }: { reps: MockRep[]; selected: string | null }) {
  const item = (active: boolean) =>
    cn('rounded-full transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary', active ? 'opacity-100 ring-2 ring-primary ring-offset-2' : 'opacity-60 hover:opacity-100');
  return (
    <nav aria-label="Switch rep" className="flex items-center gap-1.5">
      <Link href="/" aria-current={!selected} className={cn(item(!selected), 'flex h-8 items-center bg-zinc-900 px-3 text-xs font-semibold text-white')}>
        All
      </Link>
      {reps.map((r) => (
        <Link key={r.id} href={`/?rep=${r.id}`} title={r.name} aria-label={r.name} aria-current={selected === r.id} className={item(selected === r.id)}>
          <RepAvatar rep={r} />
        </Link>
      ))}
    </nav>
  );
}
