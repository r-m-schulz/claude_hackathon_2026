export function VercelFull({ width = 84, height = 22 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="118" height="30" rx="8" fill="#0f172a" />
      <polygon points="24,6 8,26 40,26" fill="#ffffff" />
      <text x="50" y="21" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="'Inter', system-ui">
        Vercel
      </text>
    </svg>
  );
}
