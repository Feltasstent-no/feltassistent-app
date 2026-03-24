import apertureIcon from '../assets/aperture_icon_light.svg';

type BadgeSize = 'sm' | 'md' | 'lg';

interface ApertureIconBadgeProps {
  size?: BadgeSize;
  className?: string;
}

const sizeConfig: Record<BadgeSize, { container: string; icon: string }> = {
  sm: { container: 'w-8 h-8 rounded-lg', icon: 'w-5 h-5' },
  md: { container: 'w-10 h-10 rounded-lg', icon: 'w-6 h-6' },
  lg: { container: 'w-14 h-14 rounded-xl', icon: 'w-8 h-8' },
};

export function ApertureIconBadge({ size = 'md', className = '' }: ApertureIconBadgeProps) {
  const config = sizeConfig[size];

  return (
    <div className={`bg-emerald-600 ${config.container} flex items-center justify-center flex-shrink-0 ${className}`}>
      <img src={apertureIcon} alt="" className={`${config.icon} brightness-0 invert`} />
    </div>
  );
}
