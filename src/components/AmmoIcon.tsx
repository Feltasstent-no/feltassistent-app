interface AmmoIconProps {
  className?: string;
}

export function AmmoIcon({ className = 'w-6 h-6' }: AmmoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect x="3.5" y="10" width="3" height="8" rx="0.5" fill="currentColor" />
      <rect x="3.5" y="7" width="3" height="4" rx="1.5" fill="currentColor" />

      <rect x="8" y="10" width="3" height="8" rx="0.5" fill="currentColor" />
      <rect x="8" y="7" width="3" height="4" rx="1.5" fill="currentColor" />

      <rect x="12.5" y="10" width="3" height="8" rx="0.5" fill="currentColor" />
      <rect x="12.5" y="7" width="3" height="4" rx="1.5" fill="currentColor" />

      <rect x="17" y="10" width="3" height="8" rx="0.5" fill="currentColor" />
      <rect x="17" y="7" width="3" height="4" rx="1.5" fill="currentColor" />
    </svg>
  );
}
