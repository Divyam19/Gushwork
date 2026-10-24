import { formatInTimeZone } from 'date-fns-tz';
import { PackageIcon } from 'lucide-react';
import { AddLeadDialog } from '@/components/add-lead-dialog';
import { SearchPalette, type SearchLead } from '@/components/search-palette';
import { RepSwitcher } from '@/components/rep-switcher';
import { TZ } from '@/lib/dates';
import type { MockRep } from '@/lib/mock';

export function Header({ reps, rep, leads }: { reps: MockRep[]; rep: string | null; leads: SearchLead[] }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PackageIcon className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">PackRight · Follow-ups</h1>
          <p className="text-sm text-muted-foreground">{formatInTimeZone(new Date(), TZ, 'EEEE, d MMM')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <RepSwitcher reps={reps} selected={rep} />
        <SearchPalette leads={leads} rest={rep ? `rep=${rep}` : ''} />
        <AddLeadDialog reps={reps} rep={rep} />
      </div>
    </header>
  );
}
