export function JobCard({ job, onSelect, compact = false, isSelected = false, onEdit = null, onTogglePublish = null, isEmployer = false }) {
  if (!job) return null
  return (
    <div
      id={`job-${job.id}`}
      className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-primary hover:shadow-sm'} ${compact ? 'p-4' : 'p-6'}`}
      onClick={() => onSelect?.(job)}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
              {job.employment_type}
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100">
              {job.workplace_type}
            </span>
            {job.categories && job.categories.length > 0 && job.categories.slice(0, 2).map(cat => (
              <span key={cat.id} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100">
                {cat.name}
              </span>
            ))}
            {job.categories && job.categories.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                +{job.categories.length - 2}
              </span>
            )}
            {job.active === false && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold border border-gray-200">
                Draft
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {job.location}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEmployer && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(job)
              }}
              className="h-10 w-10 rounded-lg bg-gray-100 hover:bg-blue-500 hover:text-white text-gray-600 flex items-center justify-center transition-colors"
              title="Edit job"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {isEmployer && onTogglePublish && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTogglePublish(job)
              }}
              className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${
                job.active 
                  ? 'bg-green-100 hover:bg-red-500 text-green-600 hover:text-white' 
                  : 'bg-gray-100 hover:bg-green-500 text-gray-600 hover:text-white'
              }`}
              title={job.active ? 'Unpublish job' : 'Publish job'}
            >
              {job.active ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect?.(job)
            }}
            className="h-10 w-10 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-600 flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      {job.about_role && (
        <p className="text-sm text-gray-600 mt-4 line-clamp-2">{job.about_role}</p>
      )}
      {job.tags && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {job.tags.slice(0, 5).map((tag) => (
            <span key={`${job.id}-${tag}`} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
              {tag}
            </span>
          ))}
          {job.tags.length > 5 && (
            <span className="px-2.5 py-1 text-gray-500 text-xs font-medium">
              +{job.tags.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
