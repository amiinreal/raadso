export function ProfileCard({ profile }) {
  if (!profile) return null
  return (
    <div className="grid-card">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="pill inline-block mb-2">{profile.open_to_work ? 'Open to work' : 'Not open'}</p>
          <h3 className="text-xl font-semibold text-slate-900">{profile.full_name}</h3>
          <p className="text-sm text-slate-600">{profile.headline}</p>
          <p className="text-sm text-slate-500 mt-2">{profile.email} · {profile.phone}</p>
          <p className="text-sm text-slate-500">{profile.address}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employment</p>
          <p className="text-sm font-semibold text-primary">{profile.employment_status || 'Active'}</p>
        </div>
      </div>
      {profile.summary && <p className="text-sm text-slate-700 mt-4 leading-relaxed">{profile.summary}</p>}
    </div>
  )
}
