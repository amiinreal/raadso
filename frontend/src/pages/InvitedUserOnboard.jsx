import { useState } from 'react'
import { api } from '../api/api'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function InvitedUserOnboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tenantId = searchParams.get('tenantId')
  const email = searchParams.get('email')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resent, setResent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await api.onboardInvitedUser({ tenantId, email, firstName, lastName, password, otp })
      setSuccess('Account created! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message || 'Failed to onboard')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResent(false)
    setError('')
    try {
      await api.resendInviteOtp({ tenantId, email })
      setResent(true)
    } catch (err) {
      setError('Failed to resend OTP')
    }
  }

  if (!tenantId || !email) {
    return <div className="p-8 text-center">Invalid invitation link.</div>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-2 text-center">Complete Your Invitation</h2>
        <p className="text-gray-600 text-center mb-6">Set your details and enter the code sent to your email.</p>
        {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-3 text-center">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 p-2 rounded mb-3 text-center">{success}</div>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input type="text" className="w-full px-4 py-2 border rounded" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          <input type="text" className="w-full px-4 py-2 border rounded" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required />
          <input type="password" className="w-full px-4 py-2 border rounded" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <input type="text" className="w-full px-4 py-2 border rounded" placeholder="OTP Code" value={otp} onChange={e => setOtp(e.target.value)} required />
          <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 text-white rounded font-semibold mt-2">{loading ? 'Submitting...' : 'Complete Registration'}</button>
        </form>
        <button onClick={handleResend} className="mt-4 text-blue-600 hover:underline text-sm w-full">Resend OTP</button>
        {resent && <div className="text-green-600 text-sm mt-2 text-center">OTP resent!</div>}
      </div>
    </div>
  )
}
