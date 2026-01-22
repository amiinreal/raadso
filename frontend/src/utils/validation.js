/**
 * Frontend validation utilities
 */

// Email validation
export const isValidEmail = (email) => {
  if (!email) return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

// Password strength validation
export const isValidPassword = (password) => {
  if (!password) return false
  return password.length >= 8 && password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
}

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 'none', score: 0 }
  
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  if (score <= 2) return { strength: 'weak', score, color: 'red' }
  if (score <= 4) return { strength: 'medium', score, color: 'orange' }
  return { strength: 'strong', score, color: 'green' }
}

// URL validation
export const isValidUrl = (url) => {
  if (!url) return true // Optional
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) && url.length <= 2048
  } catch {
    return false
  }
}

// Phone number validation
export const isValidPhone = (phone) => {
  if (!phone) return true // Optional
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  return phoneRegex.test(cleaned) && cleaned.length >= 8 && cleaned.length <= 20
}

// String length validation
export const isValidLength = (str, min = 0, max = 10000) => {
  if (!str) return min === 0 // If min is 0, empty is valid
  return str.length >= min && str.length <= max
}

// Sanitize HTML/script tags
export const sanitizeHtml = (str) => {
  if (!str) return str
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
}

// Integer validation
export const isValidInteger = (num, min = 0, max = 2147483647) => {
  const parsed = parseInt(num, 10)
  return !isNaN(parsed) && parsed >= min && parsed <= max
}

// Year validation
export const isValidYear = (year) => {
  const parsed = parseInt(year, 10)
  return !isNaN(parsed) && parsed >= 1900 && parsed <= new Date().getFullYear() + 10
}

// Date validation
export const isValidDate = (dateStr) => {
  if (!dateStr) return true // Optional
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date)
}

// File validation
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected' }
  
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPG, PNG, WebP, and SVG images are allowed.' }
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }
  
  return { valid: true }
}

export const validateDocumentFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected' }
  
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only PDF, DOC, and DOCX documents are allowed.' }
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }
  
  return { valid: true }
}

// Enum validation
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship']
export const WORKPLACE_TYPES = ['Remote', 'Hybrid', 'On-site']
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK']
export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
export const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Native']

// Form validation helper
export const validateForm = (fields, validations) => {
  const errors = {}
  
  for (const [field, rules] of Object.entries(validations)) {
    const value = fields[field]
    
    // Required check
    if (rules.required && !value) {
      errors[field] = `${rules.label || field} is required`
      continue
    }
    
    // Skip further validation if field is optional and empty
    if (!rules.required && !value) continue
    
    // Email validation
    if (rules.type === 'email' && !isValidEmail(value)) {
      errors[field] = `${rules.label || field} must be a valid email`
    }
    
    // URL validation
    if (rules.type === 'url' && !isValidUrl(value)) {
      errors[field] = `${rules.label || field} must be a valid URL`
    }
    
    // Phone validation
    if (rules.type === 'phone' && !isValidPhone(value)) {
      errors[field] = `${rules.label || field} must be a valid phone number`
    }
    
    // Length validation
    if (rules.minLength || rules.maxLength) {
      if (!isValidLength(value, rules.minLength || 0, rules.maxLength || 10000)) {
        errors[field] = `${rules.label || field} must be between ${rules.minLength || 0} and ${rules.maxLength || 10000} characters`
      }
    }
    
    // Integer validation
    if (rules.type === 'integer' && !isValidInteger(value, rules.min, rules.max)) {
      errors[field] = `${rules.label || field} must be a number between ${rules.min || 0} and ${rules.max || 2147483647}`
    }
    
    // Year validation
    if (rules.type === 'year' && !isValidYear(value)) {
      errors[field] = `${rules.label || field} must be a valid year`
    }
    
    // Date validation
    if (rules.type === 'date' && !isValidDate(value)) {
      errors[field] = `${rules.label || field} must be a valid date`
    }
    
    // Custom validator
    if (rules.validator && !rules.validator(value)) {
      errors[field] = rules.message || `${rules.label || field} is invalid`
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

// Input sanitization for display
export const sanitizeInput = (input) => {
  if (!input) return input
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .slice(0, 10000) // Max length safety
}
