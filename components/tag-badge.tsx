import { cn } from '@/lib/utils';
import type { Tag } from '@/lib/schemas';
import { TAG_THEME } from '@/components/tag-theme';


export function TagBadge({ tag, score, className }: { tag: Tag; score?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', TAG_THEME[tag].pill)}>{tag}</span>
      {score !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{score}</span>}
    </span>
  );
}
