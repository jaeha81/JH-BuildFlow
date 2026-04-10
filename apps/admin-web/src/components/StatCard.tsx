interface StatCardProps {
  label: string;
  value: number | string;
  accent?: string;
  sub?: string;
}

export default function StatCard({ label, value, accent = "#5B8DEF", sub }: StatCardProps) {
  return (
    <div
      className="bg-[#1A1D27] border-2 border-white/10 p-4"
      style={{ boxShadow: `4px 4px 0px rgba(255,255,255,0.05)` }}
    >
      <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  );
}
