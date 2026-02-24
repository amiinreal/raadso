import { useState, useEffect } from 'react'
import { getDeviceId } from '../utils/device'
import { useSearchParams } from 'react-router-dom'

export function TwoFAVerify({ onSuccess }) {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)
  const [success, setSuccess] = useState('')
  const [userId, setUserId] = useState(() => searchParams.get('userId') || localStorage.getItem('pending-2fa-user-id'))

  useEffect(() => {
    if (!userId) {
      const saved = localStorage.getItem('pending-2fa-user-id')
      if (saved) setUserId(saved)
    } else {
      localStorage.setItem('pending-2fa-user-id', userId)
    }
  }, [userId])

  const handleCancel = () => {
    localStorage.removeItem('pending-2fa-user-id')
    localStorage.removeItem('pending-remember-me')
    window.location.href = '/auth'
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const deviceId = await getDeviceId()
      const pendingRemember = localStorage.getItem('pending-remember-me') === '1'
      const response = await fetch('http://localhost:4000/auth/2fa/login-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, code, trustDevice, deviceId, rememberMe: pendingRemember }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Verification failed')
      }

      const data = await response.json()

      // Store token and user info, then redirect
      localStorage.setItem('job-platform-token', data.token)
      if (data.user) {
        localStorage.setItem('job-platform-user', JSON.stringify(data.user))
      }
      const rememberFlag = typeof data.rememberMe !== 'undefined'
        ? data.rememberMe
        : pendingRemember
      localStorage.setItem('job-platform-remember-me', rememberFlag ? '1' : '0')
      localStorage.removeItem('pending-2fa-user-id')
      localStorage.removeItem('pending-remember-me')
      setSuccess('Login successful!')

      if (onSuccess) {
        // Clear all pending 2FA state and force full reload to dashboard
        localStorage.removeItem('pending-2fa-user-id')
        localStorage.removeItem('pending-2fa-redirect')
        localStorage.removeItem('pending-remember-me')
        onSuccess()
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      } else {
        setTimeout(() => {
          const storedRedirect = localStorage.getItem('pending-2fa-redirect')
          const redirectTo = data.redirectTo || storedRedirect || '/'
          localStorage.removeItem('pending-2fa-user-id')
          localStorage.removeItem('pending-2fa-redirect')
          localStorage.removeItem('pending-remember-me')
          window.location.href = redirectTo
        }, 500)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
          <p className="text-gray-600">Enter the 6-digit code sent to your email</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
              required
              className="w-full px-4 py-3 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 tracking-widest"
              placeholder="000000"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">Check your email for the code</p>
          </div>

          <div className="flex items-center gap-2 mb-4 mt-4">
            <input
              type="checkbox"
              id="trustDevice"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="trustDevice" className="text-sm text-gray-700">
              Trust this device for 30 days
            </label>
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors mt-2"
          >
            Cancel
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            Didn't receive a code? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
