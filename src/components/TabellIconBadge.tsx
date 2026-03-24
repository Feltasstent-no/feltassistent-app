import { ListOrdered } from 'lucide-react';

type BadgeSize = 'sm' | 'md' | 'lg';

interface TabellIconBadgeProps {
  size?: BadgeSize;
  className?: string;
}

const sizeConfig: Record<BadgeSize, { container: string; icon: string }> = {
  sm: { container: 'w-8 h-8 rounded-lg', icon: 'w-5 h-5' },
  md: { container: 'w-10 h-10 rounded-lg', icon: 'w-6 h-6' },
  lg: { container: 'w-14 h-14 rounded-xl', icon: 'w-8 h-8' },
};

export function TabellIconBadge({ size = 'md', className = '' }: TabellIconBadgeProps) {
  const config = sizeConfig[size];

  return (
    <div className={`bg-emerald-600 ${config.container} flex items-center justify-center flex-shrink-0 ${className}`}>
      <ListOrdered className={`${config.icon} text-white`} />
    </div>
  );
}
