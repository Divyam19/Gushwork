'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import type { MockRep } from '@/lib/mock';
import { cn } from '@/lib/utils';

export function RepSwitcher({ reps, selected, view }: { reps: MockRep[]; selected: string | null; view: string | null }) {
  const v = view ? `view=${view}` : '';
  const item = (active: boolean) =>
    cn(
      'relative flex h-7 items-center rounded-full transition-[opacity,filter,transform] duration-200 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
      active ? '' : 'opacity-55 grayscale-[40%] hover:opacity-100 hover:grayscale-0',
    );
  const pill = <motion.span layoutId="rep-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }} className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-zinc-200" />;
  return (
    <nav aria-label="Switch rep" className="flex items-center gap-0.5 rounded-full bg-zinc-100 p-0.5">
      <Link href={v ? `/?${v}` : '/'} aria-current={!selected} className={cn(item(!selected), 'px-3 text-xs font-semibold text-zinc-900')}>
        {!selected && pill}
        <span className="relative">All</span>
      </Link>
      {reps.map((r) => (
        <Link key={r.id} href={`/?rep=${r.id}${v ? `&${v}` : ''}`} title={r.name} aria-label={r.name} aria-current={selected === r.id} className={cn(item(selected === r.id), 'p-0.5')}>
          {selected === r.id && pill}
          <span className="relative"><RepAvatar rep={r} size="sm" /></span>
        </Link>
      ))}
    </nav>
  );
}
