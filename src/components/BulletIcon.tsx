interface BulletIconProps {
  className?: string;
}

export function BulletIcon({ className = 'w-6 h-6' }: BulletIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect x="5" y="9" width="8" height="6" rx="0.5" fill="currentColor" />
      <path
        d="M13 9.5 C13 9.5 13 9 13.2 9 L17.5 9 C20 9 20 12 20 12 C20 12 20 15 17.5 15 L13.2 15 C13 15 13 14.5 13 14.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}
