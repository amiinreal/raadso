import { Link } from 'react-router-dom'

export function JobDetailContent({
  job,
  onApply,
  onSave,
  isSaved = false,
  onViewFull,
  showViewFullButton = false,
  noApplyLink = false,
}) {
  if (!job) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        <p>No job selected</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-card-white rounded-xl border border-border-color shadow-soft w-full lg:h-full lg:overflow-hidden flex-1">
      {/* Job header - Responsive layout */}
      <div className="p-2 sm:p-4 lg:p-8 border-b border-gray-100 relative bg-white z-10">
        {/* Mobile/Tablet Layout */}
        <div className="lg:hidden space-y-2">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            {job.logo_url ? (
              <img
                src={job.logo_url}
                alt={job.company_name}
                className="h-12 w-12 rounded-lg object-cover border border-gray-100"
              />
            ) : (
              <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {job.company_name?.substring(0, 2).toUpperCase() || 'JP'}
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-base font-bold text-text-main text-center line-clamp-2">{job.title}</h1>

          {/* Company Name */}
          <p className="text-xs font-medium text-text-secondary text-center">
            {job.company_name || 'Company'}
          </p>

          {/* Posted Date */}
          <p className="text-xs text-text-secondary text-center">
            Posted {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>

          {/* Job Classification and Location as badges */}
          <div className="flex flex-wrap gap-1 justify-center">
            {job.employment_type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-text-main font-medium text-xs">
                {job.employment_type}
              </span>
            )}
            {job.location && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-text-main font-medium text-xs">
                {job.location}
              </span>
            )}
          </div>

          {/* Application Deadline */}
          {job.application_deadline && (
            <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded px-2 py-1 text-center font-medium">
              Deadline: {new Date(job.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-4">
              {job.logo_url ? (
                <img
                  src={job.logo_url}
                  alt={job.company_name}
                  className="h-14 w-14 rounded-xl object-cover border-2 border-gray-100 shadow-md"
                />
              ) : (
                <div className="h-14 w-14 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                  {job.company_name?.substring(0, 2).toUpperCase() || 'JP'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-text-main tracking-tight">{job.title}</h1>
                <p className="text-sm font-medium text-text-secondary mt-0.5">
                  {job.company_name || 'Company'} • Posted {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onSave && onSave(job)}
                disabled={!onSave}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all shadow-sm ${
                  isSaved
                    ? 'bg-indigo-50 text-primary border-indigo-100'
                    : 'bg-white text-text-secondary hover:text-text-main border-gray-200 hover:bg-gray-50'
                } ${!onSave ? 'opacity-60 cursor-not-allowed' : ''}`}
                title={isSaved ? 'Saved' : 'Save Job'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                </svg>
                <span className="text-sm font-semibold">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
              {noApplyLink ? (
                <button
                  onClick={() => onApply && onApply(job)}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  Apply Now
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              ) : (
                <Link
                  to={`/apply/${job.ad_number || job.id}`}
                  onClick={() => onApply && onApply(job)}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  Apply Now
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary pt-2">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-text-main font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {job.location} ({job.work_mode || 'Hybrid'})
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-text-main font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {job.job_type || 'Full-time'}
            </span>
            {job.salary && (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-text-main font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {job.salary}
              </span>
            )}
            {job.application_deadline && (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-700 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Deadline: {new Date(job.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Job content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:overflow-y-auto custom-scrollbar overflow-y-auto pb-32 lg:pb-0">
        <div className="space-y-10">
          <section>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9m0 0h5.581m0 0a2.121 2.121 0 01-3.759 1.874m6.882-3.854a2.121 2.121 0 00-3.757-1.875m-10.926 0a2.121 2.121 0 003.757 1.874M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              About the Company
            </h3>
            <div className="space-y-4 text-text-main leading-relaxed text-[15px]">
              <p>{job.about_company || 'No company description available.'}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              About the Role
            </h3>
            <div className="space-y-4 text-text-main leading-relaxed text-[15px]">
              <p>{job.about_role || 'No description available.'}</p>
            </div>
          </section>

          {job.key_responsibilities && job.key_responsibilities.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Key Responsibilities
              </h3>
              <ul className="space-y-3 text-[15px] text-text-main">
                {job.key_responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {job.required_skills && job.required_skills.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Required Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((skill, idx) => (
                  <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {job.preferred_skills && job.preferred_skills.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h-2m0 0h-2m2 0v-2m0 2v2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Preferred Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.preferred_skills.map((skill, idx) => (
                  <span key={idx} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {job.tech_stack && job.tech_stack.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.tech_stack.map((tech, idx) => (
                  <span key={idx} className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-100">
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}

          {job.tags && job.tags.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag, idx) => (
                  <span key={idx} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {job.hiring_contacts && job.hiring_contacts.length > 0 && (
            <section className="border-t border-gray-100 pt-6">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Hiring Contacts
              </h3>
              <div className="space-y-4 mb-[40px]">
                {job.hiring_contacts.map((contact, idx) => {
                  const name = typeof contact === 'string' ? contact : (contact.name || 'Contact')
                  const initials = name.substring(0, 2).toUpperCase()
                  return (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-main">{name}</p>
                          {typeof contact === 'object' && contact.title && (
                            <p className="text-xs text-text-secondary font-medium">{contact.title} at {job.company_name}</p>
                          )}
                          {typeof contact === 'object' && contact.email && (
                            <p className="text-xs text-primary font-medium">{contact.email}</p>
                          )}
                        </div>
                      </div>
                      {typeof contact === 'object' && contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-sm text-primary font-semibold hover:text-primary-hover px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors">
                          Email
                        </a>
                      )}
                      {typeof contact === 'string' && (
                        <button className="text-sm text-primary font-semibold hover:text-primary-hover px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors">
                          Contact
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {showViewFullButton && (
            <button
              onClick={() => onViewFull && onViewFull()}
              className="w-full mt-4 text-primary hover:text-primary-hover font-semibold text-sm py-2 border border-primary rounded-lg hover:bg-primary hover:text-white transition-all"
            >
              View Full Details
            </button>
          )}
        </div>

        {/* Sticky bottom actions - Mobile only */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg p-4 flex gap-2">
          {/* Save button */}
          <button
            onClick={() => onSave && onSave(job)}
            disabled={!onSave}
            className={`px-4 py-3 rounded-lg font-semibold border text-sm flex items-center justify-center gap-1.5 flex-none transition ${
              isSaved
                ? 'bg-indigo-50 text-primary border-indigo-100'
                : 'bg-white text-text-main border-gray-200'
            } ${!onSave ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={isSaved ? 'Saved' : 'Save Job'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            </svg>
            {isSaved ? 'Saved' : 'Save'}
          </button>

          {/* Apply button */}
          {noApplyLink ? (
            <button
              onClick={() => onApply && onApply(job)}
              className="flex-1 bg-primary hover:bg-primary-hover text-white px-3 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              Apply Now
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            <Link
              to={`/apply/${job.ad_number || job.id}`}
              onClick={() => onApply && onApply(job)}
              className="flex-1 bg-primary hover:bg-primary-hover text-white px-3 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 text-sm block text-center"
            >
              Apply Now
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
