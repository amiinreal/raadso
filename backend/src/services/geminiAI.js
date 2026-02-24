import fetch from 'node-fetch'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
let translateCooldownUntil = 0

const nowMs = () => Date.now()

/**
 * Analyze a candidate application against job requirements using Gemini AI
 * @param {Object} job - Job details
 * @param {Object} candidate - Candidate profile with experiences, education, skills
 * @param {String} coverLetter - Application cover letter
 * @param {Array} customFiles - Array of file objects with url and name
 * @param {String} analysisType - 'general' or 'requirements_match'
 * @returns {Object} - { matchScore: number (0-100), analysis: string }
 */
export async function analyzeApplicationMatch(job, candidate, coverLetter = '', customFiles = [], analysisType = 'general') {
  try {
    // Fetch custom file contents if any files exist
    let fileContents = ''
    if (customFiles && Array.isArray(customFiles) && customFiles.length > 0) {
      fileContents = await fetchFileContents(customFiles)
    }

    // Fetch CV profile if exists
    let cvContent = ''
    if (candidate.profile && candidate.profile.profile_cv_url) {
      cvContent = await fetchCVContent(candidate.profile.profile_cv_url)
    }

    // Build comprehensive prompt
    const prompt = buildAnalysisPrompt(job, candidate, coverLetter, fileContents, cvContent, analysisType)

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API request failed: ${response.status}`)
    }

    const data = await response.json()

    // Extract response text
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!aiResponse) {
      throw new Error('No response from Gemini AI')
    }

    // Parse the response to extract match score and analysis
    const result = parseAIResponse(aiResponse)

    return result
  } catch (error) {
    console.error('Error analyzing application with Gemini:', error)
    throw error
  }
}

async function fetchFileContents(customFiles) {
  if (!customFiles || customFiles.length === 0) return ''

  let fileContents = 'ADDITIONAL FILES:\n'

  for (const file of customFiles) {
    try {
      if (file.url) {
        const response = await fetch(file.url)
        if (response.ok) {
          const text = await response.text()
          fileContents += `\nFILE: ${file.name || 'Unknown'}\n${text.substring(0, 2000)}\n---\n`
        }
      }
    } catch (error) {
      console.error(`Error fetching file ${file.name}:`, error)
      // Continue with other files even if one fails
    }
  }

  return fileContents
}

async function fetchCVContent(cvUrl) {
  if (!cvUrl) return ''

  try {
    const response = await fetch(cvUrl)
    if (response.ok) {
      const text = await response.text()
      return `\nCANDIDATE CV/RESUME:\n${text.substring(0, 5000)}\n---\n`
    }
  } catch (error) {
    console.error('Error fetching CV:', error)
  }
  
  return ''
}

function buildAnalysisPrompt(job, candidate, coverLetter, fileContents = '', cvContent = '', analysisType = 'general') {
  const profile = candidate.profile || {}
  const workExperiences = candidate.workExperiences || []
  const educations = candidate.educations || []
  const skills = candidate.skills || []
  const languages = candidate.languages || []

  const baseContext = `
JOB DETAILS:
Title: ${job.title}
Industry: ${job.industry || 'Not specified'}
Location: ${job.location}
Employment Type: ${job.employment_type || 'Not specified'}
Seniority Level: ${job.seniority_level || 'Not specified'}
Description: ${job.description}
Requirements: ${job.requirements || 'Not specified'}
Salary Range: ${job.salary_min ? `$${job.salary_min} - $${job.salary_max}` : 'Not specified'}

CANDIDATE PROFILE:
Name: ${profile.first_name} ${profile.last_name}
Headline: ${profile.headline || 'Not specified'}
Summary: ${profile.summary || 'Not specified'}
Seniority Level: ${profile.seniority_level || 'Not specified'}
Years of Experience: ${profile.years_of_experience || 'Not specified'} years
Employment Status: ${profile.employment_status || 'Not specified'}

WORK EXPERIENCE:
${workExperiences.length > 0 ? workExperiences.map(exp =>
    `- ${exp.job_title} at ${exp.company_name} (${exp.start_date} - ${exp.end_date || 'Present'})
   ${exp.employment_type ? `Type: ${exp.employment_type}` : ''}
   ${exp.description || ''}`
  ).join('\n') : 'No work experience listed'}

EDUCATION:
${educations.length > 0 ? educations.map(edu =>
    `- ${edu.degree} in ${edu.field_of_study} from ${edu.institution} (${edu.start_year} - ${edu.end_year || 'Present'})`
  ).join('\n') : 'No education listed'}

SKILLS:
${skills.length > 0 ? skills.map(skill =>
    `- ${skill.skill_name} (${skill.proficiency || 'Not specified'})`
  ).join(', ') : 'No skills listed'}

LANGUAGES:
${languages.length > 0 ? languages.map(lang =>
    `- ${lang.language} (${lang.proficiency || 'Not specified'})`
  ).join(', ') : 'No languages listed'}

COVER LETTER:
${coverLetter || 'No cover letter provided'}

${cvContent}

${fileContents}
`

  if (analysisType === 'requirements_match') {
    return `You are an expert recruitment AI. Perform a strict "Requirements Match" analysis for this candidate against the job.

${baseContext}

IMPORTANT: Analyze ALL provided materials including profile data, work experience, education, skills, languages, cover letter, CV/resume file, and any additional uploaded files. Give appropriate weight to all materials.

RESPONSE FORMAT (IMPORTANT - Follow exactly):
MATCH_SCORE: [number between 0-100 based strictly on requirements coverage]

ANALYSIS:
[Provide a structured analysis comparing candidate skills vs job requirements:
- **Requirements Match**: List key requirements from the job description and indicate if the candidate matches (Yes/No/Partial) and why.
- **Missing Critical Skills**: Clearly list any required skills or experiences the candidate lacks.
- **Experience Alignment**: Evaluate if the candidate's years of experience and seniority level match the role's needs.
- **Document Analysis**: Note relevant information found in CV and uploaded files.
- **Recommendation**: A concise summary of whether they are a technical fit.]`
  }

  return `You are an expert recruitment AI. Analyze this job application and provide:
1. A match score (0-100%) representing how well the candidate fits the role
2. A comprehensive detailed analysis explaining the score

${baseContext}

IMPORTANT: Perform DEEP analysis of ALL provided materials including:
- Candidate profile (summary, headline, experience level)
- Work experience history and achievements
- Education and qualifications
- Technical and soft skills
- Languages
- Cover letter (evaluate how well candidate articulates fit and motivation)
- CV/Resume file content
- Any additional uploaded documents/certificates

ANALYSIS REQUIREMENTS:
1. Start with an overall MATCH PERCENTAGE (0-100%)
2. List all REQUIRED JOB REQUIREMENTS and indicate if candidate meets each (YES/NO/PARTIAL)
3. For each requirement NOT met or PARTIALLY met, clearly explain the gap
4. Highlight candidate STRENGTHS that align with the role
5. Identify any CONCERNS or RISKS
6. Assess if candidate is EASY TO TRAIN or READY NOW for the role
7. Evaluate cover letter for how well it addresses job requirements and shows genuine interest
8. Provide final RECOMMENDATION: STRONG MATCH / GOOD MATCH / MODERATE MATCH / POOR MATCH

Give appropriate weight to all materials. Consider:
- Years of experience vs. job requirements
- Skill gaps that could be learned vs. critical skills that cannot be trained
- How well the cover letter demonstrates understanding of the role
- Education and certifications relevance

RESPONSE FORMAT (IMPORTANT - Follow exactly):
MATCH_SCORE: [number between 0-100]

ANALYSIS:
[Provide structured detailed analysis covering:

OVERALL ASSESSMENT:
[1-2 sentences on the overall fit]

REQUIRED REQUIREMENTS ANALYSIS:
- [Requirement 1]: [YES/NO/PARTIAL] - [Brief explanation]
- [Requirement 2]: [YES/NO/PARTIAL] - [Brief explanation]
[Continue for all key requirements]

KEY STRENGTHS:
- [Strength 1]: [How it aligns with job]
- [Strength 2]: [How it aligns with job]

GAPS & CONCERNS:
- [Gap 1]: [What's missing and how critical]
- [Gap 2]: [What's missing and how critical]

COVER LETTER ASSESSMENT:
[How well does the cover letter demonstrate understanding of role? Does it show genuine interest?]

READINESS LEVEL:
[Is this person READY NOW, or would they need TRAINING in specific areas? How long would onboarding take?]

FINAL RECOMMENDATION:
[Choose one: STRONG MATCH / GOOD MATCH / MODERATE MATCH / POOR MATCH]
[Brief justification]]`
}

function parseAIResponse(aiResponse) {
  try {
    // Extract match score
    const scoreMatch = aiResponse.match(/MATCH_SCORE:\s*(\d+)/i)
    const matchScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50

    // Extract analysis (everything after "ANALYSIS:")
    const analysisMatch = aiResponse.match(/ANALYSIS:\s*([\s\S]+)/i)
    let analysis = analysisMatch ? analysisMatch[1].trim() : aiResponse

    // Clean up analysis
    analysis = analysis
      .replace(/MATCH_SCORE:\s*\d+/gi, '')
      .trim()

    return {
      matchScore: Math.min(100, Math.max(0, matchScore)), // Ensure 0-100 range
      analysis: analysis || 'Unable to generate detailed analysis at this time.'
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
    return {
      matchScore: 50,
      analysis: aiResponse || 'Analysis not available'
    }
  }
}

/**
 * Generate AI analysis in multiple languages
 * @param {Object} job - Job details
 * @param {Object} candidate - Candidate profile
 * @param {String} coverLetter - Application cover letter
 * @param {Array} customFiles - Custom file attachments
 * @param {String} analysisType - 'general' or 'requirements_match'
 * @param {Array} languages - Languages to generate analysis for (e.g., ['en', 'so'])
 * @returns {Object} - { matchScore, analyses: { en: string, so: string } }
 */
export async function analyzeApplicationMatchMultiLang(job, candidate, coverLetter = '', customFiles = [], analysisType = 'general', languages = ['en']) {
  try {
    // First, get the English analysis
    const englishAnalysis = await analyzeApplicationMatch(job, candidate, coverLetter, customFiles, analysisType)
    
    const analyses = {
      en: englishAnalysis.analysis
    }

    // If additional languages requested, translate the analysis
    if (languages.length > 1) {
      for (const lang of languages) {
        if (lang === 'en') continue // Already have English

        try {
          const translated = await translateText({
            key: `applications.employer.ai.analysis.${job.id}.${candidate.id}`,
            sourceText: englishAnalysis.analysis,
            sourceLanguage: 'en',
            targetLanguage: lang === 'so' ? 'Somali' : lang,
            description: `AI analysis for job application match`,
            domain: 'applications',
            uiContext: `AI detailed analysis for ${job.title} vs ${candidate.profile?.first_name} ${candidate.profile?.last_name}`
          })
          analyses[lang] = translated
        } catch (error) {
          console.error(`Failed to translate analysis to ${lang}:`, error)
          // Fall back to English if translation fails
          analyses[lang] = englishAnalysis.analysis
        }
      }
    }

    return {
      matchScore: englishAnalysis.matchScore,
      analyses
    }
  } catch (error) {
    console.error('Error generating multi-language analysis:', error)
    throw error
  }
}

/**
 * Batch analyze multiple applications for a job
 * @param {Object} job - Job details
 * @param {Array} applications - Array of application objects with candidate data
 * @returns {Array} - Array of results with applicationId, matchScore, analysis
 */
export async function batchAnalyzeApplications(job, applications) {
  const results = []

  for (const app of applications) {
    try {
      const analysis = await analyzeApplicationMatch(job, app.candidate, app.cover_letter)
      results.push({
        applicationId: app.id,
        matchScore: analysis.matchScore,
        analysis: analysis.analysis
      })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Error analyzing application ${app.id}:`, error)
      results.push({
        applicationId: app.id,
        matchScore: null,
        analysis: `Error: ${error.message}`
      })
    }
  }

  return results
}

export async function translateText({
  key,
  sourceText,
  sourceLanguage = 'en',
  targetLanguage,
  description = '',
  domain = 'common',
  uiContext = '',
}) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  if (!sourceText || !targetLanguage) {
    throw new Error('sourceText and targetLanguage are required')
  }

  if (translateCooldownUntil && nowMs() < translateCooldownUntil) {
    const waitMs = translateCooldownUntil - nowMs()
    const err = new Error(`AI translate temporarily throttled. Retry in ${Math.ceil(waitMs / 1000)}s`)
    err.status = 429
    err.retryAfterMs = waitMs
    throw err
  }

  const prompt = `You are a professional translator.
Translate the provided ${sourceLanguage} UI text into ${targetLanguage}.
Do not add explanations.
Do not rephrase.
Return ONLY the translated text.
No markdown. No quotes. No extra words.

Metadata:
- Domain: ${domain || 'common'}
- Key: ${key || 'n/a'}
- Description: ${description || 'n/a'}
- UI context: ${uiContext || 'n/a'}

Source (${sourceLanguage}): ${sourceText}`

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 180,
        candidateCount: 1,
      }
    })
  })

  if (!response.ok) {
    let retryAfterMs = 0
    try {
      const errorJson = await response.json()
      console.error('Gemini translate error:', JSON.stringify(errorJson, null, 2))
      const retryInfo = errorJson?.error?.details?.find((d) => d['@type']?.includes('RetryInfo'))
      if (retryInfo?.retryDelay) {
        const match = String(retryInfo.retryDelay).match(/(\d+\.?\d*)s/)
        if (match) retryAfterMs = Math.ceil(parseFloat(match[1]) * 1000)
      }
    } catch {
      const errorText = await response.text().catch(() => '')
      console.error('Gemini translate error (text):', errorText)
    }

    if (!retryAfterMs) {
      const retryHeader = response.headers.get('retry-after')
      if (retryHeader) {
        const seconds = Number(retryHeader)
        if (!Number.isNaN(seconds)) retryAfterMs = seconds * 1000
      }
    }

    if (response.status === 429) {
      const cooldown = Math.max(retryAfterMs || 25000, 15000) // default 15-25s
      translateCooldownUntil = nowMs() + cooldown
      const err = new Error('Gemini translate failed: quota exceeded, please retry soon')
      err.status = 429
      err.retryAfterMs = cooldown
      throw err
    }

    const err = new Error(`Gemini translate failed: ${response.status}`)
    err.status = response.status
    throw err
  }

  const data = await response.json()
  const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!suggestion) {
    throw new Error('Empty translation response from Gemini')
  }
  return suggestion
}
