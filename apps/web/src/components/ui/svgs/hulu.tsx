export function Hulu({ width = 64, height = 22 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 90 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="88" height="30" rx="8" fill="#0f172a" />
      <text x="14" y="21" fill="#22c55e" fontSize="14" fontWeight="700" fontFamily="'Inter', system-ui">
        hulu
      </text>
    </svg>
  );
}
