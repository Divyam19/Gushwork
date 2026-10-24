'use client';

import { SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TagBadge } from '@/components/tag-badge';
import { Button } from '@/components/ui/button';
import { Command, CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Tag } from '@/lib/schemas';

export interface SearchLead { id: string; name: string; company: string; phone: string; tag: Tag | null }

export function SearchPalette({ leads, rest }: { leads: SearchLead[]; rest: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} aria-label="Search leads">
        <SearchIcon /> <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded bg-zinc-100 px-1.5 text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search leads" description="Search by name, company or phone">
        <Command>
          <CommandInput placeholder="Search name, company or phone…" />
          <CommandList>
            <CommandEmpty>No leads found.</CommandEmpty>
            {leads.map((l) => (
              <CommandItem
                key={l.id}
                value={`${l.name} ${l.company} ${l.phone}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/?${rest}${rest ? '&' : ''}lead=${l.id}`, { scroll: false });
                }}
              >
                <span className="flex-1 truncate">{l.name} · {l.company}</span>
                <span className="text-xs text-muted-foreground">{l.phone}</span>
                {l.tag && <TagBadge tag={l.tag} />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
