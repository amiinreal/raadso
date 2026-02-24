import fs from 'fs'
import path from 'path'

const FRONTEND_ROOTS = [
  path.resolve(process.cwd(), '..', 'frontend', 'src', 'pages'),
  path.resolve(process.cwd(), '..', 'frontend', 'src', 'components'),
]

const ALLOWED_EXT = new Set(['.jsx', '.js', '.tsx', '.ts'])

const personasByDir = {
  candidate: ['candidate', 'Candidate'],
  employer: ['employer', 'Employer'],
}

const toSlug = (text) => text.toLowerCase()
  .replace(/[^a-z0-9]+/g, '.')
  .replace(/^\.+|\.+$/g, '')
  .replace(/\.+/g, '.')

const CLASSIFIERS = [
  { test: (base) => /footer/i.test(base), persona: 'shared', page: 'footer' },
  { test: (base) => /navbar|roleswitcher|sitenotice/i.test(base), persona: 'shared', page: 'navbar' },
  { test: (base) => /landing/i.test(base), persona: 'candidate', page: 'landing' },
  { test: (base) => /auth|login|forgotpassword|resetpassword|twofa/i.test(base), persona: 'shared', page: 'auth' },
  { test: (base) => /invited|accepttenant|onboard/i.test(base), persona: 'employer', page: 'onboarding' },
  { test: (base) => /settings/i.test(base), persona: 'candidate', page: 'settings' },
  { test: (base) => /tenantmembers|tenantpermissions/i.test(base), persona: 'employer', page: 'tenant' },
  { test: (base) => /platformlegal|legal|terms|privacy/i.test(base), persona: 'shared', page: 'legal' },
  { test: (base) => /savedsearch/i.test(base), persona: 'candidate', page: 'saved-searches' },
  { test: (base) => /company|employerdashboard|employerapps|employerapplications/i.test(base), persona: 'employer', page: 'applications' },
  { test: (base) => /applicantreview/i.test(base), persona: 'employer', page: 'applications' },
  { test: (base) => /jobform|jobselectionlist/i.test(base), persona: 'employer', page: 'jobs' },
]

const guessPersona = (filePath) => {
  const segments = filePath.split(path.sep).map((s) => s.toLowerCase())
  if (segments.some((s) => personasByDir.employer.some((p) => s.includes(p.toLowerCase())))) return 'employer'
  if (segments.some((s) => personasByDir.candidate.some((p) => s.includes(p.toLowerCase())))) return 'candidate'
  return 'shared'
}

const classify = (filePath) => {
  const base = path.basename(filePath, path.extname(filePath))
  const defaultPersona = guessPersona(filePath)
  const defaultPage = toSlug(base).replace(/\./g, '-') || 'shared'

  for (const rule of CLASSIFIERS) {
    if (rule.test(base)) {
      return { persona: rule.persona || defaultPersona, page: rule.page || defaultPage }
    }
  }

  return { persona: defaultPersona, page: defaultPage }
}

const walk = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, files)
    } else if (ALLOWED_EXT.has(path.extname(entry.name))) {
      files.push(full)
    }
  }
  return files
}

const extractTextFromFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8')
  const texts = new Set()

  // Extract JSX text between tags
  const jsxRegex = />\s*([^<>{}][^<>{}]*)\s*</g
  let m
  while ((m = jsxRegex.exec(content)) !== null) {
    const text = m[1].trim()
    if (text && /[a-zA-Z]/.test(text)) {
      texts.add(text)
    }
  }

  // Extract fallback strings in t('key', 'Fallback')
  const tRegex = /t\([^,]+,\s*['"]([^'"]+)['"]\)/g
  while ((m = tRegex.exec(content)) !== null) {
    const text = m[1].trim()
    if (text && /[a-zA-Z]/.test(text)) {
      texts.add(text)
    }
  }

  return Array.from(texts)
}

export function extractStrings({ persona = 'candidate' } = {}) {
  const files = FRONTEND_ROOTS.flatMap((root) => walk(root))
  const results = []
  const seen = new Set()
  files.forEach((file) => {
    const { persona: detectedPersona, page } = classify(file)
    if (persona !== 'all' && detectedPersona !== persona) return
    const texts = extractTextFromFile(file)
    texts.forEach((text) => {
      const key = `${detectedPersona}.${page}.${toSlug(text).slice(0, 60) || 'text'}`
      if (seen.has(key)) return
      seen.add(key)
      results.push({
        key,
        text,
        persona: detectedPersona,
        page,
        file: path.relative(process.cwd(), file),
      })
    })
  })
  return results
}
