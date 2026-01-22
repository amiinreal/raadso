import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { rankIndustriesByQuery } from '../utils/industrySearch'

export function Companies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [industries, setIndustries] = useState([])
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [industrySearch, setIndustrySearch] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)
  const [resultCount, setResultCount] = useState(0)

  useEffect(() => {
    fetchIndustries()
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [search, industry, location])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showIndustryDropdown && !e.target.closest('.industry-dropdown-container')) {
        setShowIndustryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showIndustryDropdown])

  const fetchIndustries = async () => {
    try {
      const response = await fetch(`${api.baseURL}/industries`)
      const data = await response.json()
      setIndustries(data)
    } catch (error) {
      console.error('Error fetching industries:', error)
    }
  }

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (industry) params.append('industry', industry)
      if (location) params.append('location', location)

      const response = await fetch(`${api.baseURL}/companies?${params}`, {
        headers: api.getAuthHeaders()
      })
      const data = await response.json()
      setCompanies(data)
      setResultCount(Array.isArray(data) ? data.length : 0)
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-main mb-2">Explore Companies</h1>
        <p className="text-text-secondary">Discover companies and follow your favorites</p>
      </div>

      {/* Search Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Search Companies</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Industry</label>
            <div className="relative industry-dropdown-container">
              <input
                type="text"
                value={industrySearch}
                onChange={(e) => { setIndustrySearch(e.target.value); setShowIndustryDropdown(true) }}
                onFocus={() => setShowIndustryDropdown(true)}
                placeholder="Search industries..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {showIndustryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setIndustry('')
                      setIndustrySearch('')
                      setShowIndustryDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    All Industries
                  </button>
                  {rankIndustriesByQuery(industries, industrySearch).map(({ category, items }) => (
                    <div key={category}>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                        {category}
                      </div>
                      {items.map((ind) => (
                        <button
                          key={ind.id}
                          onClick={() => {
                            setIndustry(ind.slug)
                            setIndustrySearch(ind.name)
                            setShowIndustryDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                        >
                          {ind.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Oslo, Norway..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Active filters + results */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {industry && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                Industry: {industrySearch}
                <button
                  aria-label="Clear industry filter"
                  className="hover:text-indigo-900"
                  onClick={() => { setIndustry(''); setIndustrySearch('') }}
                >
                  ×
                </button>
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                Location: {location}
                <button
                  aria-label="Clear location filter"
                  className="hover:text-slate-900"
                  onClick={() => setLocation('')}
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <div className="text-xs text-text-secondary">
            Showing {resultCount} compan{resultCount === 1 ? 'y' : 'ies'}{industry ? ` in ${industrySearch}` : ''}
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-text-secondary">Loading companies...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-text-main">No companies found</h3>
          <p className="mt-2 text-text-secondary">Try adjusting your search filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => navigate(`/companies/${company.slug}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-white font-bold text-xl">
                      {company.company_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-text-main truncate">{company.company_name}</h3>
                    {(company.industry_name || company.industry) && (
                      <p className="text-sm text-text-secondary">{company.industry_name || company.industry}</p>
                    )}
                  </div>
                </div>

                {company.description && (
                  <p className="text-sm text-text-secondary line-clamp-2 mb-4">{company.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  {company.location && (
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {company.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {company.job_count || 0} Jobs
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {company.follower_count || 0} Followers
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
