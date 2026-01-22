import { useState } from 'react'

export function CandidateApps({ applications = [] }) {
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
            My Applications
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Job Applications</h2>
          <p className="text-gray-600 text-sm">Track and manage all applications you've submitted</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold mb-1">TOTAL</p>
            <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-600 font-semibold mb-1">APPLIED</p>
            <p className="text-2xl font-bold text-blue-700">{applications.filter(a => a.status === 'applied').length}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <p className="text-xs text-yellow-600 font-semibold mb-1">REVIEWING</p>
            <p className="text-2xl font-bold text-yellow-700">{applications.filter(a => a.status === 'reviewing').length}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-xs text-green-600 font-semibold mb-1">ACCEPTED</p>
            <p className="text-2xl font-bold text-green-700">{applications.filter(a => a.status === 'accepted').length}</p>
          </div>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No applications yet</h3>
            <p className="text-gray-600">Start applying to jobs to see them here</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map(app => (
              <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{app.job_title || 'Job Title'}</h3>
                    <p className="text-sm text-gray-600 mt-1">{app.company_name || 'Company'}</p>
                    {app.location && <p className="text-sm text-gray-600">{app.location}</p>}
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border capitalize ${statusColors[app.status] || statusColors.applied}`}>
                    {app.status || 'applied'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  {app.applied_at && (
                    <p>Applied {new Date(app.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
