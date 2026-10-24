import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Rep } from '@/lib/schemas';
import { cn } from '@/lib/utils';

export function RepAvatar({ rep, size = 'default', className }: { rep: Rep; size?: 'sm' | 'default' | 'lg'; className?: string }) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback style={{ backgroundColor: rep.color }} className={cn('font-semibold text-white', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
        {rep.initials}
      </AvatarFallback>
    </Avatar>
  );
}
