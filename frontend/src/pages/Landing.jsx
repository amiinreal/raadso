import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { ServerDownBanner } from '../components/ServerDownBanner'
import { useTranslation } from '../i18n/TranslationProvider'

export function Landing({ onLogin, onSearch, jobs = [] }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [companies, setCompanies] = useState([])
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await api.getCompanies()
        setCompanies(data)
      } catch (err) {
        console.error('Failed to fetch companies:', err)
      }
    }
    fetchCompanies()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchDropdown(false)
      }
    }

    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchDropdown])

  const handleSearch = (e) => {
    e.preventDefault()
    onSearch?.({ search, location })
  }

  const searchLower = search.toLowerCase()

  // Filter jobs by search term for live dropdown
  const filteredJobs = useMemo(() => {
    if (!search) return []
    const exactAdMatch = jobs.find(job => job.ad_number?.toString().toLowerCase() === searchLower)
    if (exactAdMatch) return [exactAdMatch]
    return jobs
      .filter((job) => {
        return search
          ? job.title?.toLowerCase().includes(searchLower) || 
            job.description?.toLowerCase().includes(searchLower) ||
            job.about_role?.toLowerCase().includes(searchLower) ||
            job.about_company?.toLowerCase().includes(searchLower) ||
            job.key_responsibilities?.some(resp => resp?.toLowerCase().includes(searchLower)) ||
            job.required_skills?.some(skill => skill?.toLowerCase().includes(searchLower)) ||
            job.preferred_skills?.some(skill => skill?.toLowerCase().includes(searchLower)) ||
            job.tags?.some(tag => tag?.toLowerCase().includes(searchLower)) ||
            job.company_name?.toLowerCase().includes(searchLower) ||
            job.ad_number?.toString().includes(search)
          : false
      })
      .slice(0, 8)
  }, [jobs, search])

  // Filter companies by search term for live dropdown
  const filteredCompanies = useMemo(() => {
    if (!search) return []
    return companies
      .filter((company) => {
        return search
          ? company.name?.toLowerCase().includes(searchLower) || 
            company.description?.toLowerCase().includes(searchLower) ||
            company.industry?.toLowerCase().includes(searchLower)
          : false
      })
      .slice(0, 8)
  }, [companies, search])

  const handleJobSelect = (job) => {
    setShowSearchDropdown(false)
    navigate(`/jobs/${job.ad_number || job.id}`)
  }

  const handleCompanySelect = (company) => {
    setShowSearchDropdown(false)
    navigate(`/companies/${company.slug || company.id}`)
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <ServerDownBanner isVisible={jobs.length === 0} />
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4">
            {t('landing.hero.title')}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            {t('landing.hero.description')}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onLogin}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow-soft hover:opacity-90 transition"
            >
              {t('landing.hero.cta.signin')}
            </button>
            <a
              href="#search"
              className="border border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary/5 transition"
            >
              {t('landing.hero.cta.explore')}
            </a>
          </div>
        </div>

        {/* Search Section */}
        <div id="search" className="grid-card mb-16">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">{t('landing.search.title')}</h2>
          <form onSubmit={handleSearch} className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-sm text-slate-700">
                <span className="font-semibold block mb-2">{t('landing.search.jobTitle')}</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('landing.search.jobPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setShowSearchDropdown(e.target.value.length > 0)
                  }}
                  onFocus={() => setShowSearchDropdown(search.length > 0)}
                />
              </label>

              {/* Live search dropdown */}
              {showSearchDropdown && (filteredJobs.length > 0 || filteredCompanies.length > 0) && (
                <div 
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto"
                >
                  {/* Jobs Category */}
                  {filteredJobs.length > 0 && (
                    <div>
                      <div className="sticky top-0 px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('landing.search.dropdown.jobs')}</p>
                      </div>
                      {filteredJobs.map((job) => (
                        <div
                          key={`job-${job.id}`}
                          onClick={() => handleJobSelect(job)}
                          className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                        >
                          <div className="flex items-start gap-2">
                            {job.company_logo_url && (
                              <img 
                                src={job.company_logo_url} 
                                alt={job.company_name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{job.title}</p>
                              <p className="text-xs text-slate-600 truncate">{job.company_name}</p>
                              {job.ad_number && (
                                <p className="text-xs text-slate-400">{t('landing.search.dropdown.jobId')}: {job.ad_number}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Companies Category */}
                  {filteredCompanies.length > 0 && (
                    <div>
                      <div className="sticky top-0 px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('landing.search.dropdown.companies')}</p>
                      </div>
                      {filteredCompanies.map((company) => (
                        <div
                          key={`company-${company.id}`}
                          onClick={() => handleCompanySelect(company)}
                          className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                        >
                          <div className="flex items-start gap-2">
                            {company.logo_url && (
                              <img 
                                src={company.logo_url} 
                                alt={company.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
                              {company.industry && (
                                <p className="text-xs text-slate-600 truncate">{company.industry}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <label className="text-sm text-slate-700">
              <span className="font-semibold block mb-2">{t('landing.search.location')}</span>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('landing.search.locationPlaceholder')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="md:col-span-2 bg-primary text-white rounded-lg py-3 font-semibold shadow-soft hover:opacity-90 transition"
            >
              {t('landing.search.button')}
            </button>
          </form>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="grid-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('landing.features.title1')}</h3>
            <p className="text-sm text-slate-600">{t('landing.features.description1')}</p>
          </div>

          <div className="grid-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('landing.features.title2')}</h3>
            <p className="text-sm text-slate-600">{t('landing.features.description2')}</p>
          </div>

          <div className="grid-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('landing.features.title3')}</h3>
            <p className="text-sm text-slate-600">{t('landing.features.description3')}</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-primary text-white rounded-xl p-12 text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <p className="text-4xl font-bold mb-2">{t('landing.stats.rolesCount')}</p>
              <p className="text-primary-light">{t('landing.stats.activeRoles')}</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">{t('landing.stats.companiesCount')}</p>
              <p className="text-primary-light">{t('landing.stats.companies')}</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">{t('landing.stats.usersCount')}</p>
              <p className="text-primary-light">{t('landing.stats.activeUsers')}</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-4">{t('landing.cta.ready')}</p>
          <button
            onClick={onLogin}
            className="bg-primary text-white px-8 py-3 rounded-lg font-semibold shadow-soft hover:opacity-90 transition"
          >
            {t('landing.cta.button')}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
