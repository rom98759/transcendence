export function MatchNode({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <div
      className={`
        px-6 py-3 rounded-full text-sm font-medium
        ${highlight ? 'bg-cyan-500 text-white shadow-lg' : 'bg-white/70 text-gray-600'}
        backdrop-blur border border-cyan-200
      `}
    >
      {label}
    </div>
  );
}
