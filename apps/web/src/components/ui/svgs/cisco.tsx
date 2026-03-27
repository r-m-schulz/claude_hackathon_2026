export function Cisco({ width = 60, height = 30 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 100 36" fill="none" aria-hidden>
      <rect x="1" y="1" width="98" height="34" rx="8" fill="#0f172a" />
      <g stroke="#38bdf8" strokeWidth="2" strokeLinecap="round">
        <line x1="16" y1="10" x2="16" y2="24" />
        <line x1="26" y1="6" x2="26" y2="24" />
        <line x1="36" y1="10" x2="36" y2="24" />
      </g>
      <text x="48" y="23" fill="#38bdf8" fontSize="12" fontWeight="700" fontFamily="'Inter', system-ui">
        Cisco
      </text>
    </svg>
  );
}
