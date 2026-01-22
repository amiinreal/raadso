import { useState } from 'react'

export function AdminLogin({ onLogin, loading, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onLogin?.({ email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        {/* Security Warning Banner */}
        <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900 mb-1">⚠️ RESTRICTED ACCESS</h3>
              <p className="text-xs text-red-800">All access attempts are logged and monitored. Unauthorized access is strictly prohibited and may be prosecuted.</p>
            </div>
          </div>
        </div>

        <div className="grid-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin Portal</p>
              <p className="text-xl font-semibold text-slate-900">Job Platform</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Administrator Login</h2>
          <p className="text-sm text-slate-600 mb-6">Sign in with your admin credentials to manage tenants and approvals.</p>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="text-sm text-slate-700">
              <span className="font-semibold">Email</span>
              <input
                type="email"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              <span className="font-semibold">Password</span>
              <input
                type="password"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              className="w-full bg-slate-900 text-white rounded-lg py-3 font-semibold shadow-soft hover:opacity-90 disabled:opacity-60 transition-opacity"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-600 flex items-center gap-2">
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>IP addresses and login attempts are recorded for security purposes</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
