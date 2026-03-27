export function Bolt({ width = 56, height = 22 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 80 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="78" height="30" rx="8" fill="#0f172a" />
      <path d="M34 22 40 10h-6l6-10-2 8h6l-4 14z" fill="#fbbf24" />
    </svg>
  );
}
