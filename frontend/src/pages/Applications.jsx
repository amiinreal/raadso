import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { useTranslation } from '../i18n/TranslationProvider'

export function Applications({ applications = [], candidateId, token }) {
  const [selectedApplication, setSelectedApplication] = useState(null)
  const { t } = useTranslation()

  const statusColors = {
    'applied': 'bg-blue-50 text-blue-700 border-blue-200',
    'reviewing': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'accepted': 'bg-green-50 text-green-700 border-green-200',
    'rejected': 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background-light">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('applications.myApplications')}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('applications.yourJobApplications')}</h2>
          <p className="text-gray-600 text-sm">{t('applications.trackAndManage')}</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold mb-1">{t('applications.stats.total')}</p>
            <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-600 font-semibold mb-1">{t('applications.stats.applied')}</p>
            <p className="text-2xl font-bold text-blue-700">{applications.filter(a => a.status === 'applied').length}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <p className="text-xs text-yellow-600 font-semibold mb-1">{t('applications.stats.reviewing')}</p>
            <p className="text-2xl font-bold text-yellow-700">{applications.filter(a => a.status === 'reviewing').length}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-xs text-green-600 font-semibold mb-1">{t('applications.stats.accepted')}</p>
            <p className="text-2xl font-bold text-green-700">{applications.filter(a => a.status === 'accepted').length}</p>
          </div>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-white">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-2 text-lg font-medium">{t('applications.noApplicationsYet')}</p>
            <p className="text-gray-500 text-sm">{t('applications.startApplying')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{app.job_title || t('applications.unknownJob')}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[app.status] || statusColors['applied']}`}>
                        {app.status || 'applied'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {app.company_name || t('applications.company')}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {app.job_location}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-2">{t('applications.applied')}</p>
                    <p className="text-sm font-medium text-gray-700">{t('applications.appliedOn', { date: new Date(app.applied_at).toLocaleDateString() })}</p>
                  </div>
                </div>

                {/* Submission Summary */}
                <div className="flex items-center gap-3 mb-3 text-xs">
                  {app.used_profile && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {t('applications.submissionSummary.profile')}
                    </span>
                  )}
                  {app.used_cv && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {t('applications.submissionSummary.cv')}
                    </span>
                  )}
                  {app.custom_files && app.custom_files.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 012-2h6a1 1 0 00-.707.293L6.293 6.586A1 1 0 006 7.293V4zm2 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z" />
                      </svg>
                      {t('applications.submissionSummary.files', { count: app.custom_files.length })}
                    </span>
                  )}
                  {app.cover_letter && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      {t('applications.submissionSummary.coverLetter')}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedApplication(app)}
                  className="text-primary hover:text-primary-hover font-semibold text-sm flex items-center gap-1"
                >
                  {t('applications.viewDetails')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedApplication(null)}>
          <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200 p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedApplication.job_title}</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedApplication.company_name} · {selectedApplication.job_location}</p>
                <p className="text-xs text-gray-500 mt-2">{t('applications.modal.appliedOn', { date: new Date(selectedApplication.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })}</p>
              </div>
              <button
                onClick={() => setSelectedApplication(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-2">{t('applications.modal.applicationStatus')}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border capitalize ${selectedApplication.status === 'applied' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedApplication.status === 'reviewing' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      selectedApplication.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-red-50 text-red-700 border-red-200'
                  }`}>
                  {selectedApplication.status || 'applied'}
                </span>
              </div>

              {/* What You Submitted */}
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-3">{t('applications.modal.whatYouSubmitted')}</p>
                <div className="space-y-2">
                  {selectedApplication.used_profile && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                      <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-green-900">{t('applications.modal.savedProfile')}</span>
                    </div>
                  )}
                  {selectedApplication.used_cv && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-blue-900">{t('applications.modal.cvAttachment')}</span>
                    </div>
                  )}
                  {selectedApplication.custom_files && selectedApplication.custom_files.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">{t('applications.modal.customDocuments', { count: selectedApplication.custom_files.length })}</p>
                      <div className="space-y-2">
                        {selectedApplication.custom_files.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors"
                          >
                            <svg className="w-5 h-5 text-purple-700" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 012-2h6a1 1 0 00-.707.293L6.293 6.586A1 1 0 006 7.293V4zm2 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-purple-900">{file.requirementName}</p>
                              <p className="text-xs text-purple-700">{file.fileName}</p>
                            </div>
                            <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Letter */}
              {selectedApplication.cover_letter && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-3">{t('applications.modal.coverLetter')}</p>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedApplication.cover_letter || t('applications.modal.noCoverLetter')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
