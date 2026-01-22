import fetch from 'node-fetch'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDCqer4pEJsFOvqQkCC_mxirGRLAd0gz38'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

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
2. A detailed analysis explaining the score

${baseContext}

IMPORTANT: Perform DEEP analysis of ALL provided materials including:
- Candidate profile (summary, headline, experience level)
- Work experience history and achievements
- Education and qualifications
- Technical and soft skills
- Languages
- Cover letter
- CV/Resume file content
- Any additional uploaded documents/certificates

Give appropriate weight to all materials. A comprehensive candidate with strong documentation should score higher than one with minimal information.

RESPONSE FORMAT (IMPORTANT - Follow exactly):
MATCH_SCORE: [number between 0-100]

ANALYSIS:
[Provide detailed analysis covering:
- Key strengths and how they align with job requirements
- Relevant experience and skills match
- Areas where candidate excels
- Potential gaps or concerns
- Education and qualifications relevance
- Insights from CV and uploaded documents
- Overall recommendation

Keep analysis concise but informative (3-5 paragraphs).]`
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
