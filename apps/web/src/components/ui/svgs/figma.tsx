export function Figma({ width = 24, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="1" y="1" width="38" height="38" rx="9" fill="#0f172a" />
      <circle cx="20" cy="12" r="6" fill="#22c55e" />
      <circle cx="12" cy="20" r="6" fill="#f97316" />
      <circle cx="20" cy="20" r="6" fill="#6366f1" />
      <path d="M26 20a6 6 0 1 1-6 6V20h6Z" fill="#a855f7" />
    </svg>
  );
}
