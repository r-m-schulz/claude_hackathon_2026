export function FirebaseFull({ width = 80, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 110 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="108" height="30" rx="8" fill="#0f172a" />
      <path d="M20 6 12 24l8-5 8 5-8-18Z" fill="#fbbf24" />
      <text x="40" y="21" fill="#fbbf24" fontSize="12" fontWeight="700" fontFamily="'Inter', system-ui">
        Firebase
      </text>
    </svg>
  );
}
