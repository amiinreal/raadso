export function LoadingSpinner({ fullScreen = true, size = 'md', message = '' }) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
        <img src="/src/assets/star.gif" alt="Loading..." className="w-full h-full" />
      </div>
      {message && <p className="text-gray-600 text-base font-medium text-center">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen bg-white flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-16">
      {spinner}
    </div>
  );
}
