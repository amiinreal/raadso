import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/api'

export function CompanyProfile() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isOwner = user.role === 'employer' // Will check against company ownership

  useEffect(() => {
    fetchCompany()
    if (user.userId) {
      checkFollowStatus()
    }
  }, [slug])

  const fetchCompany = async () => {
    try {
      const response = await fetch(`${api.baseURL}/companies/${slug}`)
      const data = await response.json()
      setCompany(data)
    } catch (error) {
      console.error('Error fetching company:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`${api.baseURL}/companies/${slug}/is-following`, {
        headers: api.getAuthHeaders()
      })
      const data = await response.json()
      setIsFollowing(data.isFollowing)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!user.userId) {
      navigate('/login')
      return
    }

    try {
      if (isFollowing) {
        await fetch(`${api.baseURL}/companies/${slug}/follow`, {
          method: 'DELETE',
          headers: api.getAuthHeaders()
        })
      } else {
        await fetch(`${api.baseURL}/companies/${slug}/follow`, {
          method: 'POST',
          headers: api.getAuthHeaders()
        })
      }
      setIsFollowing(!isFollowing)
      fetchCompany() // Refresh follower count
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const extractYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary">Company not found</p>
      </div>
    )
  }

  return (
    <main className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary to-accent-purple h-48"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        {/* Company Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="shrink-0">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.company_name}
                  className="h-32 w-32 rounded-xl object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="h-32 w-32 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-lg">
                  {company.company_name?.substring(0, 2).toUpperCase() || 'CO'}
                </div>
              )}
            </div>

            {/* Company Info */}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-text-main mb-2">{company.company_name}</h1>
                  {company.industry && (
                    <p className="text-lg text-text-secondary">{company.industry}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  {isOwner && (
                    <button
                      onClick={() => navigate('/company/edit')}
                      className="px-6 py-2 border border-primary text-primary rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                  {!isOwner && user.userId && (
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        isFollowing
                          ? 'bg-gray-100 text-text-main border border-gray-300 hover:bg-gray-200'
                          : 'bg-primary text-white hover:bg-primary-hover'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-4">
                {company.location && (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {company.location}
                  </span>
                )}
                {company.company_size && (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {company.company_size}
                  </span>
                )}
                {company.founded_year && (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Founded {company.founded_year}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                )}
              </div>

              <div className="flex gap-6 text-sm">
                <span className="text-text-main font-semibold">
                  {company.follower_count || 0} Followers
                </span>
                <span className="text-text-main font-semibold">
                  {company.job_count || 0} Active Jobs
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {(company.about || company.description) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-text-main mb-4">About</h2>
                <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                  {company.about || company.description}
                </p>
              </div>
            )}

            {/* Mission */}
            {company.mission && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-text-main mb-4">Mission</h2>
                <p className="text-text-secondary leading-relaxed whitespace-pre-line">{company.mission}</p>
              </div>
            )}

            {/* Culture */}
            {company.culture && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-text-main mb-4">Culture & Values</h2>
                <p className="text-text-secondary leading-relaxed whitespace-pre-line">{company.culture}</p>
              </div>
            )}

            {/* YouTube Videos */}
            {company.youtube_videos && company.youtube_videos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-text-main mb-4">Videos</h2>
                <div className="space-y-6">
                  {company.youtube_videos.map((video, idx) => {
                    const videoId = video.embed_id || extractYouTubeId(video.url)
                    return (
                      <div key={idx}>
                        {video.title && <h3 className="font-semibold text-text-main mb-2">{video.title}</h3>}
                        {videoId && (
                          <div className="relative aspect-video rounded-lg overflow-hidden">
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}`}
                              title={video.title || 'Company Video'}
                              className="absolute inset-0 w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Open Positions */}
            {company.jobs && company.jobs.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-text-main mb-4">Open Positions ({company.jobs.length})</h2>
                <div className="space-y-4">
                  {company.jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => navigate('/jobs')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer"
                    >
                      <h3 className="font-semibold text-text-main mb-2">{job.title}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {job.location}
                        </span>
                        {job.employment_type && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{job.employment_type}</span>
                        )}
                        {job.workplace_type && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{job.workplace_type}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Social Links */}
            {company.social_links && Object.keys(company.social_links).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-text-main mb-4">Connect</h3>
                <div className="space-y-3">
                  {company.social_links.linkedin && (
                    <a
                      href={company.social_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {company.social_links.twitter && (
                    <a
                      href={company.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                      </svg>
                      Twitter
                    </a>
                  )}
                  {company.social_links.facebook && (
                    <a
                      href={company.social_links.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </a>
                  )}
                  {company.social_links.instagram && (
                    <a
                      href={company.social_links.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      Instagram
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-text-main mb-4">Contact</h3>
              <div className="space-y-3 text-sm">
                {company.company_email && (
                  <a href={`mailto:${company.company_email}`} className="flex items-start gap-3 text-text-secondary hover:text-primary">
                    <svg className="h-5 w-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="break-all">{company.company_email}</span>
                  </a>
                )}
                {company.phone && (
                  <a href={`tel:${company.phone}`} className="flex items-center gap-3 text-text-secondary hover:text-primary">
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {company.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
