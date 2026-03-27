export function Spotify({ width = 80, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 110 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="108" height="30" rx="8" fill="#0f172a" />
      <circle cx="20" cy="16" r="9" fill="#22c55e" />
      <path d="M14 14c4-2 12-1 14 2M14 17c4-2 12-1 14 2" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
      <text x="40" y="21" fill="#22c55e" fontSize="12" fontWeight="700" fontFamily="'Inter', system-ui">
        Spotify
      </text>
    </svg>
  );
}
