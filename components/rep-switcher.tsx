'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { RepAvatar } from '@/components/rep-avatar';
import type { Rep } from '@/lib/schemas';
import { cn } from '@/lib/utils';

export function RepSwitcher({ reps, selected, view }: { reps: Rep[]; selected: string | null; view: string | null }) {
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

/** Phone version: scrollable chips with names, in the page flow. 36px visually; the ::after pads the tap area to 44px. */
export function RepChips({ reps, selected, view }: { reps: Rep[]; selected: string | null; view: string | null }) {
  const v = view ? `view=${view}` : '';
  const chip = (active: boolean) =>
    cn(
      'relative flex h-9 shrink-0 items-center after:absolute after:inset-x-0 after:-inset-y-1 gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 transition-[background-color,color,transform] active:scale-95',
      active ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200',
    );
  return (
    <nav aria-label="Switch rep" className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-1 [scrollbar-width:none] md:hidden">
      <Link href={v ? `/?${v}` : '/'} aria-current={!selected} className={chip(!selected)}>All reps</Link>
      {reps.map((r) => (
        <Link key={r.id} href={`/?rep=${r.id}${v ? `&${v}` : ''}`} aria-current={selected === r.id} className={cn(chip(selected === r.id), 'pl-1')}>
          <RepAvatar rep={r} size="sm" /> {r.name.split(' ')[0]}
        </Link>
      ))}
    </nav>
  );
}
