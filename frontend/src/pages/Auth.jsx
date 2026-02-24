import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isValidEmail, isValidPassword, getPasswordStrength, sanitizeInput } from '../utils/validation'
import { ServerDownBanner } from '../components/ServerDownBanner'

export function Auth({ mode = 'login', onToggleMode, onLogin, onRegister, loading, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('candidate')
  const [rememberMe, setRememberMe] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPasswordStrength, setShowPasswordStrength] = useState(false)

  const passwordStrength = getPasswordStrength(password)

  const validateFields = () => {
    const errors = {}

    if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (mode === 'register') {
      if (!firstName || firstName.trim().length < 1) {
        errors.firstName = 'First name is required'
      } else if (firstName.length > 100) {
        errors.firstName = 'First name must be less than 100 characters'
      }

      if (lastName && lastName.length > 100) {
        errors.lastName = 'Last name must be less than 100 characters'
      }

      if (!isValidPassword(password)) {
        errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number'
      }

      if (!agreedToTerms) {
        errors.terms = 'You must agree to the Privacy Policy and Terms of Service'
      }
    } else {
      if (!password || password.length < 1) {
        errors.password = 'Password is required'
      }
    }

    return errors
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const errors = validateFields()
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    const sanitizedData = {
      email: sanitizeInput(email),
      password, // Don't sanitize password
      ...(mode === 'register' && {
        role,
        firstName: sanitizeInput(firstName),
        lastName: sanitizeInput(lastName),
        agreedToTerms
      }),
      ...(mode === 'login' && { rememberMe })
    }

    if (mode === 'login') {
      onLogin?.(sanitizedData)
    } else {
      onRegister?.(sanitizedData)
    }
  }

  return (
    <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="w-full max-w-5xl">
        <ServerDownBanner isVisible={error?.includes('fetch')} />
        <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left side - Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center h-full relative z-10 bg-white">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-4 border border-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {mode === 'login' ? 'Secure Login' : 'Secure Registration'}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-gray-600 text-sm">
              {mode === 'login'
                ? 'Enter your credentials to access your dashboard.'
                : 'Fill in the details below to get started.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="firstName">
                    First Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border ${validationErrors.firstName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                      id="firstName"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value)
                        if (validationErrors.firstName) {
                          setValidationErrors(prev => ({ ...prev, firstName: null }))
                        }
                      }}
                      placeholder="Jordan"
                      maxLength={100}
                      required
                    />
                  </div>
                  {validationErrors.firstName && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="lastName">
                    Last Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border ${validationErrors.lastName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                      id="lastName"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value)
                        if (validationErrors.lastName) {
                          setValidationErrors(prev => ({ ...prev, lastName: null }))
                        }
                      }}
                      placeholder="Avery"
                      maxLength={100}
                      required
                    />
                  </div>
                  {validationErrors.lastName && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.lastName}</p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${validationErrors.email ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (validationErrors.email) {
                      setValidationErrors(prev => ({ ...prev, email: null }))
                    }
                  }}
                  placeholder="you@example.com"
                  maxLength={254}
                  required
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-900" htmlFor="password">
                  Password
                </label>
                {mode === 'login' && (
                  <a className="text-xs text-primary font-medium hover:underline" href="/forgot-password">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${validationErrors.password ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400 sm:text-sm`}
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setShowPasswordStrength(mode === 'register')
                    if (validationErrors.password) {
                      setValidationErrors(prev => ({ ...prev, password: null }))
                    }
                  }}
                  placeholder="••••••••"
                  minLength={mode === 'register' ? 8 : 1}
                  maxLength={128}
                  required
                />
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>
              )}
              {mode === 'register' && showPasswordStrength && password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i < passwordStrength.score
                          ? passwordStrength.color === 'green'
                            ? 'bg-green-500'
                            : passwordStrength.color === 'orange'
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          : 'bg-gray-200'
                          }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength.strength === 'strong'
                    ? 'text-green-600'
                    : passwordStrength.strength === 'medium'
                      ? 'text-orange-600'
                      : 'text-red-600'
                    }`}>
                    {passwordStrength.strength === 'strong' && 'Strong password'}
                    {passwordStrength.strength === 'medium' && 'Medium strength - consider adding special characters'}
                    {passwordStrength.strength === 'weak' && 'Weak password - use 8+ chars with uppercase, lowercase & numbers'}
                  </p>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="role">
                    I am a
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <select
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all sm:text-sm"
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="candidate">Job seeker</option>
                      <option value="employer">Employer</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="agreedToTerms"
                      name="agreedToTerms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked)
                        if (validationErrors.terms) {
                          setValidationErrors(prev => ({ ...prev, terms: null }))
                        }
                      }}
                      className={`h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded ${validationErrors.terms ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="ml-2 text-sm">
                    <label htmlFor="agreedToTerms" className={`font-medium ${validationErrors.terms ? 'text-red-700' : 'text-gray-700'}`}>
                      I agree to the <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link> and Terms of Service
                    </label>
                    {validationErrors.terms && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.terms}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="flex items-center">
                <input
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="ml-2 block text-sm text-gray-600" htmlFor="remember-me">
                  Remember me
                </label>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-lg shadow-sm transition-all transform active:scale-[0.99] flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={onToggleMode}
                className="text-primary font-semibold hover:text-primary-hover transition-colors"
              >
                {mode === 'login' ? 'Create free account' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Right side - Benefits */}
        <div className="bg-gray-50 p-8 sm:p-12 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-60"></div>

          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Why sign up?</h3>
            <div className="space-y-8">
              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">For Job Seekers</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Create a comprehensive profile with seniority and CV. Apply to roles instantly with one click and track your applications.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">For Employers</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Post roles with detailed requirements. Access a unified dashboard to review structured candidate data efficiently.
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mt-4">
                <div className="flex gap-2 mb-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <p className="text-sm italic text-gray-600 leading-relaxed">
                  "Enterprise-ready schema supports detailed hiring workflows and candidate matching algorithms tailored for tech teams."
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  )
}
