import { User } from 'lucide-react';

const BG_COLORS = [
  'bg-emerald-600',
  'bg-blue-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-sky-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-slate-600',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

function getInitials(name: string | null | undefined): string | null {
  if (!name || !name.trim()) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface InitialsAvatarProps {
  name: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-24 h-24 text-2xl',
};

export function InitialsAvatar({ name, size = 'md', className = '' }: InitialsAvatarProps) {
  const initials = getInitials(name);
  const bgColor = name ? getColorFromName(name) : 'bg-slate-400';

  if (!initials) {
    return (
      <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white ${className}`}>
        <User className={size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold select-none ${className}`}>
      {initials}
    </div>
  );
}
