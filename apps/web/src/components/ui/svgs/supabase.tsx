export function SupabaseFull({ className, width = 90, height = 22 }: { className?: string; width?: number; height?: number }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 120 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="118" height="30" rx="8" fill="#0f172a" />
      <path d="M20 24 34 8v10h10l-14 16v-10H20Z" fill="#10b981" />
      <text x="50" y="21" fill="#10b981" fontSize="12" fontWeight="700" fontFamily="'Inter', system-ui">
        Supabase
      </text>
    </svg>
  );
}
