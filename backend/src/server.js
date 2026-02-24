import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import hpp from 'hpp'
import 'dotenv/config'

import jobsRouter from './routes/jobs.js'
import jobAssignmentsRouter from './routes/job-assignments.js'
import applicationAssignmentsRouter from './routes/application-assignments.js'
import candidatesRouter from './routes/candidates.js'
import applicationsRouter from './routes/applications.js'
import authRouter from './routes/auth.js'
import tenantsRouter from './routes/tenants.js'
import profileItemsRouter from './routes/profile-items.js'
import usersRouter from './routes/users.js'
import jobCategoriesRouter from './routes/job-categories.js'
import companiesRouter from './routes/companies.js'
import industriesRouter from './routes/industries.js'
import uploadRouter from './routes/upload.js'
import masterLanguagesRouter from './routes/master-languages.js'
import masterNationalitiesRouter from './routes/master-nationalities.js'
import twoFARouter from './routes/two-fa.js'
import tenantMembersRouter from './routes/tenant-members.js'
import messagesRouter from './routes/messages.js'
import { recommendationsRouter } from './routes/recommendations.js'
import { configRouter } from './routes/config.js'
import translationsRouter from './routes/translations.js'
import i18nRouter from './routes/i18n.js'
import adminRouter from './routes/admin.js'
import serverStatusRouter from './routes/serverStatus.js'
import { startNotificationScheduler } from './services/notificationService.js'
import { getTranslationMap, DEFAULT_LANGUAGE } from './services/translationService.js'
import { serverStatusMiddleware } from './middleware/serverStatus.js'

const app = express()

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}))

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id']
}))

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window for auth endpoints
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit GET /auth/me (user verification)
    return req.method === 'GET' && req.path === '/me'
  }
})

// General rate limiter - much more generous for normal API usage
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per window (much higher for normal usage)
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit GET requests (reading data)
    return req.method === 'GET'
  }
})

// Body parser with size limit
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// Data sanitization against NoSQL injection
app.use(mongoSanitize())

// Prevent HTTP parameter pollution
app.use(hpp())

// Server status middleware (add early so it's available everywhere)
app.use(serverStatusMiddleware)

// Apply rate limiters
app.use('/auth', authLimiter)
app.use('/upload', authLimiter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(generalLimiter)

// Server status routes (public, no auth required)
app.use('/api/server', serverStatusRouter)

app.use('/jobs', jobsRouter)
app.use('/job-assignments', jobAssignmentsRouter)
app.use('/application-assignments', applicationAssignmentsRouter)
app.use('/candidates', candidatesRouter)
app.use('/applications', applicationsRouter)
app.use('/auth', authRouter)
app.use('/auth/2fa', twoFARouter)
app.use('/tenants', tenantsRouter)
app.use('/tenant-members', tenantMembersRouter)
app.use('/profile', profileItemsRouter)
app.use('/users', usersRouter)
app.use('/job-categories', jobCategoriesRouter)
app.use('/industries', industriesRouter)
app.use('/companies', companiesRouter)
app.use('/upload', uploadRouter)
app.use('/master-languages', masterLanguagesRouter)
app.use('/master-nationalities', masterNationalitiesRouter)
app.use('/master-nationalities', masterNationalitiesRouter)
app.use('/recommendations', recommendationsRouter)
app.use('/messages', messagesRouter)
app.use('/config', configRouter)
app.use('/translations', translationsRouter)
app.use('/i18n', i18nRouter)
app.use('/admin', adminRouter)

const port = Number(process.env.PORT || 4000)

async function ensureTranslationsReady() {
  try {
    const map = await getTranslationMap(DEFAULT_LANGUAGE)
    const size = Object.keys(map || {}).length
    console.log(`[i18n] Loaded ${size} ${DEFAULT_LANGUAGE} translation entries`)
    if (size === 0) {
      throw new Error('Default language translations are empty; seed translations before starting the server.')
    }
  } catch (err) {
    console.error('[i18n] Failed to load default translations', err)
    throw err
  }
}

async function startServer() {
  try {
    await ensureTranslationsReady()
  } catch (err) {
    console.error('[i18n] Non-fatal error loading translations:', err.message)
    // process.exit(1) // Don't exit in production if translations fail to load initially
  }

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`)

    // Start notification scheduler - checks every 120 minutes by default
    startNotificationScheduler(120)
  })
}

startServer()
