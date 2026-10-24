import { PackageIcon } from 'lucide-react';
import { AddLeadDialog } from '@/components/add-lead-dialog';
import { SearchPalette, type SearchLead } from '@/components/search-palette';
import { RepSwitcher } from '@/components/rep-switcher';
import type { MockRep } from '@/lib/mock';

export function Header({ reps, rep, leads }: { reps: MockRep[]; rep: string | null; leads: SearchLead[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
            <PackageIcon className="size-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
            PackRight <span className="font-normal text-zinc-400">/ Follow-ups</span>
          </span>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <RepSwitcher reps={reps} selected={rep} />
          <div className="flex items-center gap-2">
            <SearchPalette leads={leads} rest={rep ? `rep=${rep}` : ''} />
            <AddLeadDialog reps={reps} rep={rep} />
          </div>
        </div>
      </div>
    </header>
  );
}
