export function Claude({ width = 90, height = 26 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 130 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="128" height="30" rx="8" fill="#0f172a" />
      <path d="M16 16c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9Z" stroke="#f59e0b" strokeWidth="2" />
      <text x="40" y="21" fill="#f59e0b" fontSize="12" fontWeight="700" fontFamily="'Inter', system-ui">
        Claude
      </text>
    </svg>
  );
}
