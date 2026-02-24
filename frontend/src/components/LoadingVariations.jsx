// Different loading animation styles to choose from

export function LoadingSpinnerDots({ fullScreen = true, message = '' }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
        {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
      </div>
    </div>
  );
}

export function LoadingPulse({ fullScreen = true, message = '' }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-lg animate-pulse" />
          {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 bg-primary rounded-lg animate-pulse" />
        {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
      </div>
    </div>
  );
}

export function LoadingRing({ fullScreen = true, message = '' }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
      </div>
    </div>
  );
}

export function LoadingBars({ fullScreen = true, message = '' }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-end gap-1 h-12">
            <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '30%', animationDelay: '0s' }} />
            <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0.1s' }} />
            <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '90%', animationDelay: '0.2s' }} />
            <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0.3s' }} />
            <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '30%', animationDelay: '0.4s' }} />
          </div>
          {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex items-end gap-1 h-12">
          <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '30%', animationDelay: '0s' }} />
          <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0.1s' }} />
          <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '90%', animationDelay: '0.2s' }} />
          <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0.3s' }} />
          <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '30%', animationDelay: '0.4s' }} />
        </div>
        {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
      </div>
    </div>
  );
}
