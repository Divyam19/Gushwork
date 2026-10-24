import type { Tag } from '@/lib/schemas';

// One colour family per tag, shared by the dashboard rows and the lead sheet.
export const TAG_THEME: Record<Tag, { hero: string; avatar: string; pill: string; rail: string; label: string }> = {
  Hot: {
    hero: 'from-rose-100 via-orange-50 to-white',
    avatar: 'bg-gradient-to-br from-rose-500 to-orange-400 text-white',
    pill: 'bg-rose-600 text-white',
    rail: 'bg-rose-500',
    label: 'Ready to buy',
  },
  Warm: {
    hero: 'from-amber-100 via-amber-50 to-white',
    avatar: 'bg-gradient-to-br from-amber-400 to-yellow-300 text-amber-950',
    pill: 'bg-amber-400 text-amber-950',
    rail: 'bg-amber-400',
    label: 'Interested',
  },
  Cold: {
    hero: 'from-slate-200 via-slate-50 to-white',
    avatar: 'bg-gradient-to-br from-slate-500 to-sky-400 text-white',
    pill: 'bg-slate-600 text-white',
    rail: 'bg-slate-400',
    label: 'Cooling off',
  },
};

export function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
