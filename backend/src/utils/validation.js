/**
 * Comprehensive input validation utilities for security
 */

// Email validation
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

// Password strength validation
export const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false
  // At least 8 characters, one uppercase, one lowercase, one number
  return password.length >= 8 && password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
}

// URL validation
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) && url.length <= 2048
  } catch {
    return false
  }
}

// Phone number validation (international format)
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  return phoneRegex.test(cleaned) && cleaned.length >= 8 && cleaned.length <= 20
}

// String length validation
export const isValidString = (str, minLength = 1, maxLength = 10000) => {
  if (str === null || str === undefined) return true // Allow null/undefined for optional fields
  if (typeof str !== 'string') return false
  return str.length >= minLength && str.length <= maxLength
}

// Integer validation
export const isValidInteger = (num, min = -2147483648, max = 2147483647) => {
  if (num === null || num === undefined || num === '') return true // Allow null for optional
  const parsed = parseInt(num, 10)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
}

// Positive integer validation
export const isValidPositiveInteger = (num, max = 2147483647) => {
  if (num === null || num === undefined || num === '') return true
  const parsed = parseInt(num, 10)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max
}

// UUID validation (standard v4 format)
export const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Slug validation (lowercase alphanumeric with hyphens)
export const isValidSlug = (slug) => {
  if (!slug || typeof slug !== 'string') return false
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugRegex.test(slug) && slug.length >= 2 && slug.length <= 100
}

// Enum validation
export const isValidEnum = (value, allowedValues) => {
  return allowedValues.includes(value)
}

// Array validation
export const isValidArray = (arr, maxLength = 100) => {
  if (arr === null || arr === undefined) return true
  return Array.isArray(arr) && arr.length <= maxLength
}

// Object validation
export const isValidObject = (obj) => {
  if (obj === null || obj === undefined) return true
  return typeof obj === 'object' && !Array.isArray(obj)
}

// Sanitize string (remove HTML/script tags)
export const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

// Sanitize object recursively
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  
  const sanitized = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

// Validate employment type
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship']
export const isValidEmploymentType = (type) => isValidEnum(type, EMPLOYMENT_TYPES)

// Validate workplace type
export const WORKPLACE_TYPES = ['Remote', 'Hybrid', 'On-site']
export const isValidWorkplaceType = (type) => isValidEnum(type, WORKPLACE_TYPES)

// Validate status
export const TENANT_STATUSES = ['pending', 'approved', 'rejected']
export const isValidTenantStatus = (status) => isValidEnum(status, TENANT_STATUSES)

// Validate currency
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK']
export const isValidCurrency = (currency) => isValidEnum(currency, CURRENCIES)

// Validate company size
export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
export const isValidCompanySize = (size) => {
  if (!size) return true
  return isValidEnum(size, COMPANY_SIZES)
}

// Validate proficiency level
export const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Native']
export const isValidProficiency = (level) => isValidEnum(level, PROFICIENCY_LEVELS)

// Validate date string (YYYY-MM-DD)
export const isValidDate = (dateStr) => {
  if (!dateStr) return true // Optional
  if (typeof dateStr !== 'string') return false
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
}

// Validate year
export const isValidYear = (year) => {
  if (!year) return true
  const parsed = parseInt(year, 10)
  return Number.isInteger(parsed) && parsed >= 1900 && parsed <= new Date().getFullYear() + 10
}

// File validation
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const isValidImageFile = (mimetype, size) => {
  return ALLOWED_IMAGE_TYPES.includes(mimetype) && size <= MAX_FILE_SIZE
}

export const isValidDocumentFile = (mimetype, size) => {
  return ALLOWED_DOCUMENT_TYPES.includes(mimetype) && size <= MAX_FILE_SIZE
}

// Validation error builder
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.statusCode = 400
  }
}

// Validation middleware factory
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = []
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field]
      
      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`)
        continue
      }
      
      // Skip validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue
      }
      
      // Type validation
      if (rules.type === 'email' && !isValidEmail(value)) {
        errors.push(`${field} must be a valid email`)
      }
      if (rules.type === 'url' && !isValidUrl(value)) {
        errors.push(`${field} must be a valid URL`)
      }
      if (rules.type === 'phone' && !isValidPhone(value)) {
        errors.push(`${field} must be a valid phone number`)
      }
      if (rules.type === 'string' && !isValidString(value, rules.min, rules.max)) {
        errors.push(`${field} must be between ${rules.min || 1} and ${rules.max || 10000} characters`)
      }
      if (rules.type === 'integer' && !isValidInteger(value, rules.min, rules.max)) {
        errors.push(`${field} must be a valid integer between ${rules.min || 0} and ${rules.max || 2147483647}`)
      }
      if (rules.type === 'enum' && !isValidEnum(value, rules.values)) {
        errors.push(`${field} must be one of: ${rules.values.join(', ')}`)
      }
      if (rules.type === 'array' && !isValidArray(value, rules.maxLength)) {
        errors.push(`${field} must be an array with max ${rules.maxLength || 100} items`)
      }
      if (rules.type === 'date' && !isValidDate(value)) {
        errors.push(`${field} must be a valid date (YYYY-MM-DD)`)
      }
      if (rules.type === 'year' && !isValidYear(value)) {
        errors.push(`${field} must be a valid year`)
      }
      
      // Custom validator
      if (rules.validator && !rules.validator(value)) {
        errors.push(rules.message || `${field} is invalid`)
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') })
    }
    
    // Sanitize request body
    req.body = sanitizeObject(req.body)
    
    next()
  }
}
