import { PackageIcon } from 'lucide-react';
import { AddLeadDialog } from '@/components/add-lead-dialog';
import { SearchPalette, type SearchLead } from '@/components/search-palette';
import { RepSwitcher } from '@/components/rep-switcher';
import type { MockRep } from '@/lib/mock';

export function Header({ reps, rep, view, rest, leads }: { reps: MockRep[]; rep: string | null; view: string | null; rest: string; leads: SearchLead[] }) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-zinc-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 md:h-auto md:py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
            <PackageIcon className="size-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
            PackRight <span className="font-normal text-zinc-400">/ Follow-ups</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <RepSwitcher reps={reps} selected={rep} view={view} />
          </div>
          <div className="flex items-center gap-2">
            <SearchPalette leads={leads} rest={rest} />
            <AddLeadDialog reps={reps} rep={rep} />
          </div>
        </div>
      </div>
    </header>
  );
}
