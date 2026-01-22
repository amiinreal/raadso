export function CVTemplate({ candidate, showImage = true }) {
  if (!candidate) return null

  const { profile, workExperiences = [], educations = [], skills = [], languages = [] } = candidate

  const formatDate = (value) => {
    if (!value) return null
    if (typeof value === 'string' && value.toLowerCase() === 'present') return 'Present'

    // Handle YYYY-MM and YYYY formats gracefully
    let normalized = value
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}$/.test(value)) normalized = `${value}-01`
      if (/^\d{4}$/.test(value)) normalized = `${value}-01-01`
    }

    const d = new Date(normalized)
    if (Number.isNaN(d.getTime())) return String(value)
    return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(d)
  }

  const formatDateRange = (start, end) => {
    const s = formatDate(start)
    const e = end ? formatDate(end) : 'Present'
    if (s && e) return `${s} – ${e}`
    if (s) return s
    return e || ''
  }

  return (
    <div className="cv-template" style={{ 
      maxWidth: '210mm', 
      minHeight: '297mm', 
      margin: '0 auto', 
      padding: '15mm 20mm',
      background: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#1f2937',
      lineHeight: '1.5',
      fontSize: '11pt'
    }}>
      {/* Header */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        {showImage && profile.profile_image_url && (
          <img
            src={profile.profile_image_url}
            alt={`${profile.first_name} ${profile.last_name}`}
            style={{ 
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px', 
              height: '125px', 
              objectFit: 'cover', 
              border: '1px solid #e5e7eb',
              zIndex: 1
            }}
            crossOrigin="anonymous"
          />
        )}
        <div style={{ borderBottom: '1px solid #d1d5db', paddingBottom: '12px', paddingRight: showImage && profile.profile_image_url ? '110px' : '0' }}>
          <h1 style={{ fontSize: '20pt', fontWeight: '600', margin: '0 0 4px 0', color: '#111827' }}>
            {profile.first_name} {profile.last_name}
          </h1>
        {profile.headline && (
          <p style={{ fontSize: '11pt', color: '#374151', margin: '0 0 8px 0' }}>
            {profile.headline}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '10pt', color: '#4b5563', marginBottom: '6px' }}>
          {profile.email && <span>{profile.email}</span>}
          {profile.phone && <span>{profile.phone}</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '10pt', color: '#4b5563' }}>
          {profile.nationality && <span>{profile.nationality}</span>}
          {profile.seniority_level && <span>{profile.seniority_level}</span>}
          {profile.years_of_experience && <span>{profile.years_of_experience} years experience</span>}
        </div>
        {(profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
          <div style={{ marginTop: '8px', fontSize: '10pt', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {profile.linkedin_url && (
              <span>{profile.linkedin_url.replace('https://', '')}</span>
            )}
            {profile.github_url && (
              <span>{profile.github_url.replace('https://', '')}</span>
            )}
            {profile.portfolio_url && (
              <span>{profile.portfolio_url.replace('https://', '')}</span>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Summary */}
      {profile.summary && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: '600', color: '#111827', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px 0' }}>
            Professional Summary
          </h2>
          <p style={{ fontSize: '11pt', color: '#374151', margin: '0', lineHeight: '1.6' }}>
            {profile.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {workExperiences.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: '600', color: '#111827', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>
            Work Experience
          </h2>
          {workExperiences.map((exp, index) => (
            <div key={exp.id || index} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                <h3 style={{ fontSize: '11pt', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                  {exp.job_title}
                </h3>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', color: '#4b5563', marginBottom: '2px' }}>
                <span>{exp.company_name}</span>
                <span>{formatDateRange(exp.start_date, exp.end_date)}</span>
              </div>
              {exp.employment_type && (
                <p style={{ fontSize: '10pt', color: '#6b7280', margin: '2px 0' }}>
                  {exp.employment_type}
                </p>
              )}
              {exp.description && (
                <p style={{ fontSize: '10pt', color: '#374151', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                  {exp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {educations.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: '600', color: '#111827', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>
            Education
          </h2>
          {educations.map((edu, index) => (
            <div key={edu.id || index} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: '11pt', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                  {edu.degree} in {edu.field_of_study}
                </h3>
                <span style={{ fontSize: '10pt', color: '#4b5563' }}>{edu.start_year} – {edu.end_year || 'Present'}</span>
              </div>
              <p style={{ fontSize: '10pt', color: '#4b5563', margin: '2px 0 0 0' }}>
                {edu.institution}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: '600', color: '#111827', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px 0' }}>
            Skills
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {skills.map((skill, index) => (
              <span 
                key={skill.id || index}
                style={{ 
                  fontSize: '10pt',
                  color: '#1f2937'
                }}
              >
                {skill.skill_name} ({skill.proficiency}){index < skills.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: '600', color: '#111827', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px 0' }}>
            Languages
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {languages.map((lang, index) => (
              <span 
                key={lang.id || index}
                style={{ 
                  fontSize: '10pt',
                  color: '#1f2937'
                }}
              >
                {lang.language} ({lang.proficiency}){index < languages.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .cv-template {
            max-width: 100%;
            margin: 0;
            padding: 15mm 20mm;
            box-shadow: none;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .cv-template img {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
