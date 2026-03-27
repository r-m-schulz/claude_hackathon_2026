export function Beacon({ width = 80, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 110 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="108" height="30" rx="8" fill="#0f172a" />
      <circle cx="20" cy="16" r="9" fill="#06b6d4" />
      <circle cx="20" cy="16" r="4" fill="#ecfeff" />
      <text x="40" y="21" fill="#06b6d4" fontSize="12" fontWeight="700" fontFamily="'Inter', system-ui">
        Beacon
      </text>
    </svg>
  );
}
