export function StatCard({ label, value, detail }) {
  return (
    <div className="grid-card">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {detail && <p className="text-sm text-slate-500 mt-1">{detail}</p>}
    </div>
  )
}
