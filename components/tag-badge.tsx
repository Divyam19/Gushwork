import { cn } from '@/lib/utils';
import type { Tag } from '@/lib/schemas';

const STYLES: Record<Tag, string> = {
  Hot: 'bg-red-600 text-white',
  Warm: 'bg-amber-100 text-amber-900',
  Cold: 'bg-slate-100 text-slate-700',
};

export function TagBadge({ tag, score, className }: { tag: Tag; score?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STYLES[tag])}>{tag}</span>
      {score !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{score}</span>}
    </span>
  );
}
