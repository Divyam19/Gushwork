'use client';

import { Children, useState } from 'react';

export function ShowMore({ limit, children }: { limit: number; children: React.ReactNode }) {
  const [all, setAll] = useState(false);
  const items = Children.toArray(children);
  const hidden = items.length - limit;
  return (
    <>
      {all || hidden <= 0 ? items : items.slice(0, limit)}
      {hidden > 0 && !all && (
        <button
          onClick={() => setAll(true)}
          className="w-full px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-zinc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          Show {hidden} more
        </button>
      )}
    </>
  );
}
