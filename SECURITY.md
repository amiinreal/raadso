# Security & Validation Implementation

## Overview
Comprehensive input validation and security hardening has been implemented across the entire application to prevent data leaks, SQL injection, XSS attacks, and other security vulnerabilities.

## Backend Security Measures

### 1. Validation Utilities (`backend/src/utils/validation.js`)
- **Email validation**: RFC-compliant regex with max 254 characters
- **Password strength**: Min 8 chars, requires uppercase, lowercase, and number
- **URL validation**: Protocol check (http/https) with max 2048 characters
- **Phone validation**: International format support (E.164)
- **String length**: Configurable min/max with sanitization
- **Integer validation**: Range checks with overflow protection
- **Enum validation**: Whitelist-based validation for predefined values
- **Array validation**: Max length checks
- **Date/Year validation**: Format and range validation
- **File validation**: MIME type, size, and extension checks
- **HTML sanitization**: Removes script tags and dangerous elements
- **Recursive object sanitization**: Deep cleaning of nested data structures

### 2. Security Packages Installed
- **helmet**: Security headers (CSP, XSS protection, etc.)
- **express-rate-limit**: Rate limiting for auth and general endpoints
- **express-mongo-sanitize**: NoSQL injection prevention
- **hpp**: HTTP Parameter Pollution prevention
- **cors**: Proper CORS configuration with credentials

### 3. Rate Limiting
- **Authentication endpoints**: 10 requests per 15 minutes
- **General endpoints**: 200 requests per 15 minutes
- **Upload endpoints**: 10 requests per 15 minutes

### 4. Route Validation

#### Auth Routes (`backend/src/routes/auth.js`)
- Email format validation
- Password strength requirements (8+ chars, mixed case, numbers)
- Name length validation (1-100 characters)
- Role enum validation (candidate, employer, admin)
- Automatic sanitization of all inputs

#### Jobs Routes (`backend/src/routes/jobs.js`)
- Title: 3-200 characters
- Employment type: Enum validation (Full-time, Part-time, etc.)
- Workplace type: Enum validation (Remote, Hybrid, On-site)
- Salary: Positive integers only
- Currency: ISO 4217 codes
- Arrays: Max 50 items for responsibilities, skills, tech stack
- Deadline: Date format validation

#### Tenants/Companies Routes (`backend/src/routes/tenants.js`, `backend/src/routes/companies.js`)
- Company name: 2-200 characters
- Email & phone: Format validation
- Website: URL validation
- Org number: 5-50 characters
- Company size: Enum validation
- Founded year: 1900 to current year +10
- Industry ID: Positive integer validation
- Descriptions: Max 5000 characters

#### Profile Routes (`backend/src/routes/profile-items.js`)
- Job titles: 2-200 characters
- Employment type: Enum validation
- Dates: ISO 8601 format validation
- Skills proficiency: Enum validation (Beginner to Expert)
- Descriptions: Max 2000 characters

#### Candidates Routes (`backend/src/routes/candidates.js`)
- Names: 1-100 characters
- Email: Format validation
- Phone: International format
- URLs: Protocol and format validation
- Years of experience: 0-100 range

#### Applications Routes (`backend/src/routes/applications.js`)
- IDs: Positive integer validation
- Cover letter: Max 5000 characters
- Notes: Max 2000 characters

#### Upload Routes (`backend/src/routes/upload.js`)
- File size: Max 5MB
- Image types: JPG, PNG, WebP, SVG
- Document types: PDF, DOC, DOCX
- MIME type verification
- Extension validation
- Filename sanitization (removes special characters)

### 5. SQL Injection Prevention
- All database queries use parameterized statements
- No string concatenation in SQL queries
- Input sanitization before database operations

### 6. XSS Prevention
- HTML tag removal from all string inputs
- Script tag filtering
- Iframe and object tag removal
- Automatic sanitization via validation middleware

## Frontend Security Measures

### 1. Validation Utilities (`frontend/src/utils/validation.js`)
- Mirrors backend validation rules
- Real-time validation feedback
- Password strength indicator
- File upload validation
- Form validation helper
- Input sanitization for display

### 2. Form Validation

#### Auth Form (`frontend/src/pages/Auth.jsx`)
- Email format validation with visual feedback
- Password strength indicator (6-level visual bar)
- Real-time validation error clearing
- Input length limits enforced
- Sanitization before submission
- Red border highlighting for invalid fields

### 3. Client-Side Protection
- Max length attributes on all inputs
- Type-appropriate input validation
- File upload restrictions
- Size limits enforced
- MIME type checking

## Security Features

### 1. Authentication
- Bcrypt password hashing (10 rounds)
- JWT tokens with expiration
- Role-based access control (RBAC)
- Rate-limited login attempts

### 2. Authorization
- Route-level authentication middleware
- Ownership validation for updates
- Admin-only endpoints protected
- Tenant approval checks for job posting

### 3. Data Validation
- Input sanitization on all routes
- Type checking and conversion
- Length restrictions
- Format validation
- Enum whitelisting

### 4. File Upload Security
- Size limits (5MB)
- MIME type validation
- Extension checking
- Filename sanitization
- Secure storage (Bunny CDN)
- Old file cleanup

### 5. Headers & CORS
- Helmet security headers
- CSP (Content Security Policy)
- CORS with credentials support
- XSS protection headers
- Frame options (clickjacking prevention)

## Validation Error Messages

All validation errors return structured responses:
```json
{
  "error": "field1 must be valid; field2 is required; field3 must be between 1 and 100 characters"
}
```

## Rate Limit Headers

Rate limit information is provided in response headers:
- `RateLimit-Limit`: Total requests allowed in window
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Time when limit resets

## Best Practices Implemented

1. **Input Validation**
   - Whitelist validation over blacklist
   - Multiple layers (client + server)
   - Type-safe conversions
   - Length restrictions

2. **Output Encoding**
   - HTML sanitization
   - Script tag removal
   - Safe JSON serialization

3. **Authentication**
   - Strong password requirements
   - Secure session management
   - Token-based auth

4. **Authorization**
   - Principle of least privilege
   - Resource ownership checks
   - Role-based permissions

5. **Error Handling**
   - Generic error messages to users
   - Detailed logging server-side
   - No stack traces in production

6. **File Uploads**
   - Type validation
   - Size limits
   - Secure storage
   - Malware scanning recommended for production

## Testing Security

### Manual Testing Checklist
- [ ] Try SQL injection in all input fields
- [ ] Test XSS with `<script>alert('xss')</script>`
- [ ] Upload oversized files
- [ ] Upload files with wrong MIME types
- [ ] Test rate limiting by rapid requests
- [ ] Try accessing other users' resources
- [ ] Test password requirements
- [ ] Verify email validation
- [ ] Test long strings (10000+ chars)
- [ ] Try negative numbers where only positive allowed

### Automated Testing
Recommended tools:
- OWASP ZAP for penetration testing
- SQLMap for SQL injection testing
- Burp Suite for security scanning
- npm audit for dependency vulnerabilities

## Production Recommendations

1. **Environment Variables**
   - Use strong JWT secrets (32+ random characters)
   - Never commit secrets to version control
   - Rotate secrets regularly

2. **HTTPS**
   - Enforce HTTPS in production
   - Use HSTS headers
   - Proper SSL/TLS configuration

3. **Database**
   - Use prepared statements (already implemented)
   - Principle of least privilege for DB users
   - Regular backups
   - Encryption at rest

4. **Monitoring**
   - Log all authentication attempts
   - Monitor rate limit violations
   - Track failed validations
   - Set up alerts for suspicious activity

5. **Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Regular security audits
   - Penetration testing

## Additional Hardening (Optional)

1. **CSP (Content Security Policy)**
   - Already configured in helmet
   - Customize for your needs

2. **CSRF Protection**
   - Implement CSRF tokens for state-changing operations
   - Use SameSite cookie attributes

3. **Session Security**
   - Short JWT expiration times
   - Refresh token rotation
   - Session revocation mechanism

4. **API Versioning**
   - Version your API endpoints
   - Deprecate old versions gracefully

5. **Logging & Auditing**
   - Log all data modifications
   - User activity tracking
   - Audit trail for sensitive operations

## Compliance

This implementation helps with:
- **GDPR**: Input validation, data minimization
- **PCI DSS**: Secure data handling (if processing payments)
- **OWASP Top 10**: Addresses most common vulnerabilities
- **HIPAA**: If handling health data (additional measures needed)

## Support

For security issues or questions:
1. Review this documentation
2. Check validation utility comments
3. Test with provided validation functions
4. Consult OWASP guidelines for additional hardening

## Version History

- **v1.0.0** (2026-01-07): Initial security implementation
  - Comprehensive input validation
  - Rate limiting
  - Security headers
  - File upload security
  - Frontend validation with real-time feedback
