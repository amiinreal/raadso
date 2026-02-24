export function ServerDownPage() {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Red header bar */}
        <div className="h-1 bg-red-600 w-full" />
        
        <div className="p-8 text-center">
          {/* Server icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">Server Offline</h1>
          <p className="text-gray-600 text-lg mb-2">We're currently experiencing technical difficulties</p>
          <p className="text-gray-500 text-sm mb-6">Our team is working to get everything back online as soon as possible.</p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Status:</span> Services temporarily unavailable
            </p>
            <p className="text-xs text-red-700 mt-2">
              Please check back in a few moments
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-all"
            >
              Try Again
            </button>
            <a
              href="mailto:support@raadi.com"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition-all text-center"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
