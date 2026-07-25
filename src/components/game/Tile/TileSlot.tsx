import { cn } from '@/lib/cn';

interface TileSlotProps {
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  className?: string;
}

const SIZE_CLASS = {
  sm: 'h-10 w-7',
  md: 'h-14 w-10',
  lg: 'h-16 w-12',
};

/** Empty placeholder outline shown where a tile could be dropped. */
export function TileSlot({ size = 'md', highlight = false, className }: TileSlotProps) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed border-white/15 transition-colors',
        highlight && 'border-amber-400/70 bg-amber-400/10',
        SIZE_CLASS[size],
        className,
      )}
    />
  );
}
