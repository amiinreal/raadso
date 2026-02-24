import { useState } from 'react'

export default function AcceptTenantInvitation() {
  const params = new URLSearchParams(window.location.search)
  const tenantId = params.get('tenantId')
  const email = decodeURIComponent(params.get('email') || '')

  const [otp, setOtp] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('http://localhost:4000/tenant-members/onboard-invitee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, email, firstName, lastName, password, otp })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation')
      setSuccess('Invitation accepted! You can now log in.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold mb-2">Accept Invitation</h1>
        <p className="text-gray-600 mb-4">You are invited to join this team as <span className="font-semibold">{email}</span>.</p>
        <label className="block text-sm font-medium">First Name</label>
        <input className="w-full border px-3 py-2 rounded mb-2" value={firstName} onChange={e => setFirstName(e.target.value)} required />
        <label className="block text-sm font-medium">Last Name</label>
        <input className="w-full border px-3 py-2 rounded mb-2" value={lastName} onChange={e => setLastName(e.target.value)} required />
        <label className="block text-sm font-medium">Password</label>
        <input className="w-full border px-3 py-2 rounded mb-2" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <label className="block text-sm font-medium">OTP Code</label>
        <input className="w-full border px-3 py-2 rounded mb-2" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold" disabled={loading}>
          {loading ? 'Submitting...' : 'Accept Invitation'}
        </button>
      </form>
    </div>
  )
}
