import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { CVTemplate } from '../components/CVTemplate'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useTranslation } from '../i18n/TranslationProvider'
import { sanitizeInput } from '../utils/sanitize'

export function Profile({ candidate, candidateId, token, onUpdate }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [editingSection, setEditingSection] = useState(null)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [masterLanguages, setMasterLanguages] = useState([])
  const [masterNationalities, setMasterNationalities] = useState([])
  const [jobCategories, setJobCategories] = useState([])
  const [loadingMasters, setLoadingMasters] = useState(true)
  const [imagePreview, setImagePreview] = useState(null)
  const [showCVImage, setShowCVImage] = useState(true)

  const effectiveCandidateId = (candidate?.id && candidate.id !== 'undefined') ? candidate.id : (candidateId && candidateId !== 'undefined' ? candidateId : null)

  // Fetch master data on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [languages, nationalities, categories] = await Promise.all([
          api.getMasterLanguages(),
          api.getMasterNationalities(),
          api.getJobCategories(),
        ])
        setMasterLanguages(languages)
        setMasterNationalities(nationalities)
        setJobCategories(categories)
      } catch (err) {
        console.error('Failed to fetch master data:', err)
      } finally {
        setLoadingMasters(false)
      }
    }
    fetchMasterData()
  }, [])

  if (loadingMasters) return <LoadingSpinner message="Loading profile..." />
  if (!candidate) return <div className="p-8 text-center">{t('profile.noCandidate')}</div>

  const { profile, workExperiences = [], educations = [], skills = [], languages = [], attachments = [], interestedPositions = [] } = candidate

  const completeness = ['headline', 'summary', 'phone', 'location', 'nationality', 'seniority_level', 'years_of_experience'].reduce(
    (acc, field) => (profile?.[field] ? acc + 1 : acc),
    0,
  )
  const statusKey = profile?.open_to_work ? (completeness >= 5 ? 'ready' : 'needs-details') : 'not-looking'
  const statusText = {
    ready: t('profile.status.ready'),
    'needs-details': t('profile.status.needsDetails'),
    'not-looking': t('profile.status.notLooking'),
  }[statusKey]

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${profile.first_name} ${profile.last_name} - CV</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { margin: 0; padding: 0; }
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 0; size: A4; }
            }
          </style>
        </head>
        <body>
          <div id="cv-root"></div>
        </body>
      </html>
    `)
    printWindow.document.close()

    const cvRoot = printWindow.document.getElementById('cv-root')
    const root = createRoot(cvRoot)
    root.render(<CVTemplate candidate={candidate} showImage={showCVImage} />)

    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const handleAddItem = (section) => {
    setEditingSection(section)
    setFormData({})
    setImagePreview(null)
  }

  const handleEditItem = (section, item) => {
    setEditingSection(section)
    setFormData(item)
  }

  const handleSaveItem = async () => {
    if (!effectiveCandidateId || !token) {
      console.error('Missing candidate ID or token', { effectiveCandidateId, token })
      alert('Session error: Missing candidate ID. Please refresh.')
      return
    }

    setSaving(true)
    try {
      if (editingSection === 'experience') {
        const payload = {
          candidateId: effectiveCandidateId,
          jobTitle: formData.job_title,
          companyName: formData.company_name,
          employmentType: formData.employment_type,
          startDate: formData.start_date,
          endDate: formData.is_current ? null : formData.end_date,
          description: formData.description,
        }
        if (formData.id) {
          await api.updateWorkExperience(formData.id, payload, token)
        } else {
          await api.addWorkExperience(payload, token)
        }
      } else if (editingSection === 'education') {
        const payload = {
          candidateId: effectiveCandidateId,
          degree: formData.degree,
          fieldOfStudy: formData.field_of_study,
          institution: formData.institution,
          startYear: formData.start_year,
          endYear: formData.is_current_education ? null : formData.end_year,
        }
        if (formData.id) {
          await api.updateEducation(formData.id, payload, token)
        } else {
          await api.addEducation(payload, token)
        }
      } else if (editingSection === 'skill') {
        await api.addSkill({
          candidateId: effectiveCandidateId,
          skillName: formData.skill_name,
          proficiency: formData.proficiency,
        }, token)
      } else if (editingSection === 'language') {
        await api.addLanguage({
          candidateId: effectiveCandidateId,
          language: formData.language,
          proficiency: formData.proficiency,
        }, token)
      } else if (editingSection === 'interestedPosition') {
        if (formData.position_title && formData.position_title.trim()) {
          await api.addInterestedPosition(effectiveCandidateId, formData.position_title.trim(), token)
        } else {
          alert('Please enter a position title')
          setSaving(false)
          return
        }
      } else if (editingSection === 'attachment') {
        // Upload file to Bunny CDN first
        if (!formData.file) {
          alert('Please select a file to upload')
          return
        }

        const uploadResult = await api.uploadDocument(formData.file, token)

        await api.addAttachment({
          candidateId: effectiveCandidateId,
          type: formData.type,
          fileUrl: uploadResult.url,
        }, token)
      }

      // Refresh candidate data
      await onUpdate(effectiveCandidateId)
      setEditingSection(null)
      setFormData({})
    } catch (err) {
      console.error('Failed to save:', err)
      alert(err.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteItem = async (section, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    if (!effectiveCandidateId || !token) {
      console.error('Missing candidate ID or token', { effectiveCandidateId, token })
      alert('Session error: Missing candidate ID. Please refresh.')
      return
    }

    setSaving(true)
    try {
      if (section === 'experience') {
        await api.deleteWorkExperience(id, token)
      } else if (section === 'education') {
        await api.deleteEducation(id, token)
      } else if (section === 'skill') {
        await api.deleteSkill(id, token)
      } else if (section === 'language') {
        await api.deleteLanguage(id, token)
      } else if (section === 'interestedPosition') {
        await api.deleteInterestedPosition(effectiveCandidateId, id, token)
      } else if (section === 'attachment') {
        await api.deleteAttachment(id, token)
      }

      // Refresh candidate data
      await onUpdate(effectiveCandidateId)
    } catch (err) {
      console.error('Failed to delete:', err)
      alert(err.message || 'Failed to delete. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <div className="grid gap-4">
          <div className="grid-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <p className="pill inline-block">{statusText}</p>
                <span className="text-xs text-slate-500">{t('profile.autoUpdateHint')}</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.profile_image_url && (
                  <button
                    onClick={() => setShowCVImage(!showCVImage)}
                    className="no-print px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                    title={showCVImage ? 'Hide image in CV' : 'Show image in CV'}
                  >
                    {showCVImage ? t('profile.hideImage') : t('profile.showImage')}
                  </button>
                )}
                <button
                  onClick={handleDownloadPDF}
                  className="no-print px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-soft hover:opacity-90"
                >
                  {t('profile.downloadPdf')}
                </button>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">{profile.first_name} {profile.last_name}</h2>
            <p className="text-sm text-slate-600">{profile.headline}</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-2">
              {profile.email && <span>{t('profile.contact.email')}: {profile.email}</span>}
              {profile.phone && <span>{t('profile.contact.phone')}: {profile.phone}</span>}
              {profile.location && <span>{t('profile.contact.address')}: {profile.location}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.nationality && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{t('profile.badge.nationality')}: {profile.nationality}</span>}
              {profile.seniority_level && <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold">{t('profile.badge.seniority')}: {profile.seniority_level}</span>}
              {profile.years_of_experience && <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">{t('profile.badge.experience')}: {profile.years_of_experience}</span>}
            </div>
            {profile.summary && <p className="text-sm text-slate-700 mt-3 leading-relaxed border-t border-slate-100 pt-3">{profile.summary}</p>}

            {(profile.cv_file_url || profile.portfolio_url || profile.linkedin_url || profile.github_url) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                {profile.cv_file_url && <a href={profile.cv_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">📄 CV</a>}
                {profile.portfolio_url && <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">🎨 Portfolio</a>}
                {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">💼 LinkedIn</a>}
                {profile.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">💻 GitHub</a>}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Interested Positions</p>
                <button
                  onClick={() => handleAddItem('interestedPosition')}
                  className="text-sm text-primary font-semibold hover:underline"
                >
                  + Add Position
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interestedPositions.map((pos) => (
                  <span key={pos.id} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold group relative hover:bg-green-200">
                    {pos.position_title}
                    <button
                      onClick={() => handleDeleteItem('interestedPosition', pos.id)}
                      className="ml-2 text-red-600 opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {interestedPositions.length === 0 && <p className="text-xs text-slate-500">Add positions you're interested in to get relevant job notifications.</p>}
              </div>

              {editingSection === 'interestedPosition' && (
                <div className="mt-3 p-3 border-2 border-primary rounded-lg bg-blue-50">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Add Interested Position</h4>
                  <div className="grid gap-2">
                    <select
                      value={formData.position_title || ''}
                      onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Job Category *</option>
                      {jobCategories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveItem}
                        disabled={saving || !formData.position_title?.trim()}
                        className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? t('common.adding') : t('profile.actions.addPosition')}
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Image Section */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('profile.media.title')}</p>
                  <button
                    onClick={() => setEditingSection('media')}
                    className="text-sm text-primary font-semibold hover:underline"
                  >
                    + {t('profile.actions.uploadImage')}
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  {profile.profile_image_url ? (
                    <img src={profile.profile_image_url} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100" />
                  )}
                </div>

                {editingSection === 'media' && (
                  <div className="mt-3 p-3 border-2 border-primary rounded-lg bg-blue-50">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">{t('profile.media.uploadTitle')}</h4>
                    <div className="grid gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700">{t('profile.media.title')}</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                          <input
                            type="file"
                            id="profile-image-file"
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (file) {
                                setFormData({ ...formData, profile_image_file: file })
                                // Create preview
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setImagePreview(reader.result)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.webp,.svg"
                          />
                          {imagePreview ? (
                            <div className="flex flex-col items-center gap-2">
                              <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
                              <span className="text-xs font-medium text-slate-700">{formData.profile_image_file?.name}</span>
                              <label htmlFor="profile-image-file" className="text-xs text-blue-600 hover:underline cursor-pointer">
                                {t('profile.media.changeImage')}
                              </label>
                            </div>
                          ) : (
                            <label htmlFor="profile-image-file" className="cursor-pointer flex flex-col items-center gap-2">
                              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-xs font-medium text-slate-700">{t('profile.media.clickToUpload')}</span>
                              <span className="text-[10px] text-slate-500">JPG, PNG, WEBP, SVG (Max 10MB)</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={async () => {
                          setSaving(true)
                          try {
                            // Upload profile image
                            if (formData.profile_image_file) {
                              const imgRes = await api.uploadProfileImage(
                                formData.profile_image_file,
                                token,
                                profile.profile_image_url // Pass old image URL for deletion
                              )
                              await api.updateCandidate(effectiveCandidateId, { profileImageUrl: imgRes.url }, token)
                            }
                            await onUpdate(effectiveCandidateId)
                            setEditingSection(null)
                            setFormData({})
                            setImagePreview(null)
                          } catch (err) {
                            console.error('Failed to upload media:', err)
                            alert('Failed to upload. Please try again.')
                          } finally {
                            setSaving(false)
                          }
                        }}
                        disabled={saving || !formData.profile_image_file}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? t('common.uploading') : t('profile.actions.uploadAndSave')}
                      </button>
                      <button
                        onClick={() => { setEditingSection(null); setFormData({}); setImagePreview(null) }}
                        className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">{t('profile.sections.experience')}</h3>
              <button
                onClick={() => handleAddItem('experience')}
                className="text-sm text-primary font-semibold hover:underline"
              >
                {t('profile.actions.addExperience')}
              </button>
            </div>
            {workExperiences.length === 0 && <p className="text-slate-500 text-sm mt-3">{t('profile.hints.addExperience')}</p>}
            <div className="grid gap-3">
              {workExperiences.map((exp) => (
                <div key={exp.id} className="border border-slate-100 rounded-lg p-3 hover:border-slate-300 transition group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{exp.job_title}</p>
                      <p className="text-xs text-slate-500">{exp.company_name} · {exp.employment_type}</p>
                      <p className="text-xs text-slate-500">{exp.start_date} – {exp.end_date || 'Present'}</p>
                      <p className="text-sm text-slate-700 mt-1">{exp.description}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleEditItem('experience', exp)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteItem('experience', exp.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingSection === 'experience' && (
              <div className="mt-4 p-4 border-2 border-primary rounded-lg bg-blue-50">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  {formData.id ? t('profile.experience.edit') : t('profile.experience.add')}
                </h4>
                <div className="grid gap-3">
                  <input
                    placeholder={`${t('profile.experience.jobTitle')} *`}
                    value={formData.job_title || ''}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder={`${t('profile.experience.company')} *`}
                    value={formData.company_name || ''}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={formData.employment_type || ''}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Employment Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="date"
                      placeholder="Start Date"
                      value={formData.start_date || ''}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {!formData.is_current && (
                      <input
                        type="date"
                        placeholder="End Date"
                        value={formData.end_date || ''}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.is_current || false}
                      onChange={(e) => setFormData({ ...formData, is_current: e.target.checked, end_date: e.target.checked ? null : formData.end_date })}
                      className="rounded"
                    />
                    <span>{t('profile.experience.current')}</span>
                  </label>
                  <textarea
                    placeholder="Description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveItem}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90"
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">{t('profile.sections.education')}</h3>
              <button
                onClick={() => handleAddItem('education')}
                className="text-sm text-primary font-semibold hover:underline"
              >
                {t('profile.actions.addEducation')}
              </button>
            </div>
            {educations.length === 0 && <p className="text-slate-500 text-sm mt-3">{t('profile.hints.addEducation')}</p>}
            <div className="grid gap-3">
              {educations.map((edu) => (
                <div key={edu.id} className="border border-slate-100 rounded-lg p-3 hover:border-slate-300 transition group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{edu.degree} · {edu.field_of_study}</p>
                      <p className="text-xs text-slate-500">{edu.institution}</p>
                      <p className="text-xs text-slate-500">{edu.start_year} – {edu.end_year || 'Present'}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleEditItem('education', edu)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteItem('education', edu.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingSection === 'education' && (
              <div className="mt-4 p-4 border-2 border-primary rounded-lg bg-blue-50">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  {formData.id ? t('profile.education.edit') : t('profile.education.add')}
                </h4>
                <div className="grid gap-3">
                  <input
                    placeholder={`${t('profile.education.degree')} *`}
                    value={formData.degree || ''}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder={`${t('profile.education.field')} *`}
                    value={formData.field_of_study || ''}
                    onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder={`${t('profile.education.institution')} *`}
                    value={formData.institution || ''}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Start Year"
                      value={formData.start_year || ''}
                      onChange={(e) => setFormData({ ...formData, start_year: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {!formData.is_current_education && (
                      <input
                        type="number"
                        placeholder="End Year"
                        value={formData.end_year || ''}
                        onChange={(e) => setFormData({ ...formData, end_year: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.is_current_education || false}
                      onChange={(e) => setFormData({ ...formData, is_current_education: e.target.checked, end_year: e.target.checked ? null : formData.end_year })}
                      className="rounded"
                    />
                    <span>{t('profile.education.current')}</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveItem}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90"
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">{t('profile.sections.skills')}</h3>
              <button
                onClick={() => handleAddItem('skill')}
                className="text-sm text-primary font-semibold hover:underline"
              >
                {t('profile.actions.addSkill')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill.id} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold group relative hover:bg-slate-200">
                  {skill.skill_name} · {skill.proficiency}
                  <button
                    onClick={() => handleDeleteItem('skill', skill.id)}
                    className="ml-2 text-red-600 opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              ))}
              {skills.length === 0 && <p className="text-sm text-slate-500">{t('profile.hints.addSkills')}</p>}
            </div>

            {editingSection === 'skill' && (
              <div className="mt-4 p-4 border-2 border-primary rounded-lg bg-blue-50">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">{t('profile.actions.addSkill')}</h4>
                <div className="grid gap-3">
                  <input
                    placeholder={t('profile.placeholders.skillName')}
                    value={formData.skill_name || ''}
                    onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={formData.proficiency || ''}
                    onChange={(e) => setFormData({ ...formData, proficiency: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Proficiency Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveItem}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90"
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">{t('profile.sections.languages')}</h3>
              <button
                onClick={() => handleAddItem('language')}
                className="text-sm text-primary font-semibold hover:underline"
              >
                {t('profile.actions.addLanguage')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <span key={lang.id} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold group relative hover:bg-slate-200">
                  {lang.language} · {lang.proficiency}
                  <button
                    onClick={() => handleDeleteItem('language', lang.id)}
                    className="ml-2 text-red-600 opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              ))}
              {languages.length === 0 && <p className="text-sm text-slate-500">{t('profile.hints.addLanguages')}</p>}
            </div>

            {editingSection === 'language' && (
              <div className="mt-4 p-4 border-2 border-primary rounded-lg bg-blue-50">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">{t('profile.actions.addLanguage')}</h4>
                <div className="grid gap-3">
                  <select
                    value={formData.language || ''}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('profile.placeholders.selectLanguage')}</option>
                    {masterLanguages.map((lang) => (
                      <option key={lang.id} value={lang.name}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formData.proficiency || ''}
                    onChange={(e) => setFormData({ ...formData, proficiency: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Proficiency Level</option>
                    <option value="Basic">Basic</option>
                    <option value="Conversational">Conversational</option>
                    <option value="Fluent">Fluent</option>
                    <option value="Native">Native</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveItem}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90"
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">{t('profile.sections.attachments')}</h3>
              <button
                onClick={() => handleAddItem('attachment')}
                className="text-sm text-primary font-semibold hover:underline"
              >
                {t('profile.actions.addAttachment')}
              </button>
            </div>
            <div className="grid gap-2">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2 hover:border-slate-300 transition group">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{att.type}</p>
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block"
                      >
                        View File →
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteItem('attachment', att.id)}
                    className="text-xs text-red-600 hover:underline opacity-0 group-hover:opacity-100 transition px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {attachments.length === 0 && <p className="text-sm text-slate-500">{t('profile.hints.addAttachments', 'Upload certificates, transcripts, or other supporting documents.')}</p>}
            </div>

            {editingSection === 'attachment' && (
              <div className="mt-4 p-4 border-2 border-primary rounded-lg bg-blue-50">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">{t('profile.actions.addAttachment')}</h4>
                <div className="grid gap-3">
                  <select
                    value={formData.type || ''}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('profile.sections.attachments')} *</option>
                    <option value="CV">CV / Resume</option>
                    <option value="Portfolio">Portfolio</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Cover Letter">Cover Letter</option>
                    <option value="Transcript">Transcript</option>
                    <option value="Reference Letter">Reference Letter</option>
                    <option value="Other">Other</option>
                  </select>

                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id="attachment-file"
                      onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="attachment-file"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700">
                        {formData.file ? formData.file.name : 'Click to upload file'}
                      </span>
                      <span className="text-xs text-slate-500">PDF, DOC, DOCX, JPG, PNG (Max 10MB)</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveItem}
                      disabled={saving || !formData.type || !formData.file}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? t('common.uploading') : t('profile.actions.uploadAndSave')}
                    </button>
                    <button
                      onClick={() => {
                        setEditingSection(null)
                        setFormData({})
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
