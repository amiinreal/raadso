import { useState, useEffect } from 'react'
import { TwoFASetup } from './TwoFASetup'
import { AuditLogs } from '../components/AuditLogs'
import { api } from '../api/api'

export function Settings({ token, user, tenant }) {
  const [activeSection, setActiveSection] = useState('account')
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [showTwoFASetup, setShowTwoFASetup] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Check if user is the tenant owner (only owners can see audit logs)
  const isOwner = user?.role === 'employer' && tenant?.user_id === user?.id
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [trustedDevices, setTrustedDevices] = useState([])
  const [loadingTrusted, setLoadingTrusted] = useState(false)

  const [revokingId, setRevokingId] = useState(null)

  // Password Change State
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    if (token) {
      checkTwoFAStatus()
      if (activeSection === 'security') {
        loadTrustedDevices()
      }
    }
  }, [token, activeSection])

  const checkTwoFAStatus = async () => {
    try {
      const response = await fetch('http://localhost:4000/auth/2fa/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setTwoFAEnabled(data.enabled)
      }
    } catch (err) {
      console.error('Failed to check 2FA status:', err)
    }
  }

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA?')) return

    setLoading(true)
    setError('')
    try {
      const response = await fetch('http://localhost:4000/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: 'confirm' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disable 2FA')
      }

      setTwoFAEnabled(false)
      setSuccess('2FA has been disabled')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTrustedDevices = async () => {
    setLoadingTrusted(true)
    try {
      const data = await api.getTrustedDevices(token)
      setTrustedDevices(data.devices || [])
    } catch (err) {
      console.error('Failed to load trusted devices:', err)
    } finally {
      setLoadingTrusted(false)
    }
  }

  const handleRevokeDevice = async (deviceId) => {
    if (!window.confirm('Remove trust for this device?')) return
    setRevokingId(deviceId)
    try {
      await api.revokeTrustedDevice(deviceId, token)
      setTrustedDevices((prev) => prev.filter((d) => d.id !== deviceId))
      setSuccess('Device trust removed')
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setRevokingId(null)
    }
  }

  if (showTwoFASetup) {
    return (
      <TwoFASetup
        token={token}
        user={user}
        onComplete={() => {
          setShowTwoFASetup(false)
          checkTwoFAStatus()
        }}
      />
    )
  }

  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="w-full max-w-4xl h-full overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account and security preferences</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 flex space-x-8">
            <button
              onClick={() => setActiveSection('account')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeSection === 'account'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeSection === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
            >
              Security
            </button>
            {isOwner && (
              <button
                onClick={() => setActiveSection('audit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeSection === 'audit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
              >
                Audit Logs
              </button>
            )}
          </div>

          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              {/* Account Info Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your email address cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 capitalize"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your account role</p>
                  </div>
                </div>
              </div>

              {/* Account Preferences */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Preferences</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive email updates about applications and job matches</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* 2FA Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Add an extra layer of security to your account with 2FA via email
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full font-semibold text-xs ${twoFAEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                    }`}>
                    {twoFAEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                <div className="space-y-4">
                  {twoFAEnabled ? (
                    <button
                      onClick={handleDisable2FA}
                      disabled={loading}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTwoFASetup(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Enable 2FA
                    </button>
                  )}
                </div>

                {twoFAEnabled && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ Two-factor authentication is active on your account. You'll need to enter a code sent to your email when logging in from a new device.
                    </p>
                  </div>
                )}
              </div>

              {/* Trusted Devices */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Active Sessions</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage all active sessions on your account. Trusted devices skip 2FA for 30 days.</p>
                  </div>
                </div>

                {loadingTrusted ? (
                  <div className="text-sm text-gray-600">Loading sessions…</div>
                ) : trustedDevices.length === 0 ? (
                  <div className="text-sm text-gray-600">No active sessions.</div>
                ) : (
                  <div className="space-y-3">
                    {trustedDevices.map((device) => (
                      <div key={device.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{device.deviceLabel}</p>
                            {device.isCurrent && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Current device</span>
                            )}
                            {device.isTrusted && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Trusted</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 break-all">{device.userAgent}</p>
                          <p className="text-xs text-gray-500">IP: {device.ipAddress}</p>
                          {device.isTrusted && device.trustedAt && (
                            <p className="text-xs text-gray-500">Trusted: {new Date(device.trustedAt).toLocaleString()}</p>
                          )}
                          <p className="text-xs text-gray-500">Expires: {new Date(device.expiresAt).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeDevice(device.id)}
                          disabled={revokingId === device.id}
                          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60"
                        >
                          {revokingId === device.id ? 'Ending…' : 'End session'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Password Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Password</h2>
                <p className="text-sm text-gray-600 mb-4">You must verify your identity with a code sent to your email to change your password.</p>

                {!showPasswordChange ? (
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Change Password
                  </button>
                ) : (
                  <div className="space-y-4 max-w-md">
                    {/* Error/Success Messages */}
                    {passwordError && (
                      <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{passwordError}</div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{passwordSuccess}</div>
                    )}

                    {!otpSent ? (
                      <div>
                        <button
                          onClick={async () => {
                            setPasswordLoading(true)
                            setPasswordError('')
                            try {
                              await api.sendOtp(token)
                              setOtpSent(true)
                              setPasswordSuccess('Verification code sent to your email.')
                            } catch (err) {
                              setPasswordError(err.message || 'Failed to send verification code')
                            } finally {
                              setPasswordLoading(false)
                            }
                          }}
                          disabled={passwordLoading}
                          className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover disabled:opacity-50"
                        >
                          {passwordLoading ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                        <button
                          onClick={() => setShowPasswordChange(false)}
                          className="ml-3 px-4 py-2 text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Verification Code</label>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="6-digit code"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          />
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={async () => {
                              if (newPassword !== confirmPassword) {
                                setPasswordError('Passwords do not match')
                                return
                              }
                              if (!otp || !newPassword) {
                                setPasswordError('Please fill in all fields')
                                return
                              }

                              setPasswordLoading(true)
                              setPasswordError('')
                              try {
                                await api.changePassword(otp, newPassword, token)
                                setPasswordSuccess('Password changed successfully')
                                setOtp('')
                                setNewPassword('')
                                setConfirmPassword('')
                                setTimeout(() => {
                                  setShowPasswordChange(false)
                                  setOtpSent(false)
                                  setPasswordSuccess('')
                                }, 2000)
                              } catch (err) {
                                setPasswordError(err.message || 'Failed to change password')
                              } finally {
                                setPasswordLoading(false)
                              }
                            }}
                            disabled={passwordLoading}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover disabled:opacity-50"
                          >
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                          </button>
                          <button
                            onClick={() => {
                              setShowPasswordChange(false)
                              setOtpSent(false)
                              setPasswordError('')
                              setPasswordSuccess('')
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit Logs Section */}
          {activeSection === 'audit' && isOwner && (
            <AuditLogs 
              token={token} 
              tenantId={tenant?.id} 
              user={user}
            />
          )}
        </div>
      </div>
    </div>
  )
}
