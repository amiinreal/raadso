import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/api'

export function ResetPassword() {
    const [searchParams] = useSearchParams()
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const emailParam = searchParams.get('email')
        const codeParam = searchParams.get('code')
        if (emailParam) setEmail(emailParam)
        if (codeParam) setOtp(codeParam)
    }, [searchParams])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        setError('')
        try {
            await api.resetPassword(email, otp, newPassword)
            setSuccess(true)
            setTimeout(() => {
                navigate('/login')
            }, 3000)
        } catch (err) {
            setError(err.message || 'Failed to reset password')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                        <h2 className="text-2xl font-bold text-green-600 mb-4">Password Reset Successful!</h2>
                        <p className="text-gray-600 mb-6">Your password has been updated. You will be redirected to the login page shortly.</p>
                        <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
                            Click here if you are not redirected
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <Link to="/" className="text-3xl font-extrabold text-primary">RAADI</Link>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Set new password
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                Reset Code (OTP)
                            </label>
                            <div className="mt-1">
                                <input
                                    id="otp"
                                    name="otp"
                                    type="text"
                                    required
                                    placeholder="6-digit code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm font-mono tracking-widest"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                New Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Must be at least 8 characters with 1 uppercase, 1 lowercase number.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm New Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">{error}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Reseting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
