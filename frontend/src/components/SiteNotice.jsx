import { useState, useEffect } from 'react'

export function SiteNotice() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('job-platform-cookie-consent')
        if (!consent) {
            setIsVisible(true)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem('job-platform-cookie-consent', 'true')
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-card-dark border-t border-gray-200 dark:border-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        We use cookies to enhance your experience, analyze site traffic, and personalize content.
                        By clicking "Accept", you agree to our use of cookies.
                        <a href="/privacy-policy" className="text-primary hover:underline ml-1">Learn more</a>.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsVisible(false)} // Just hide for session if declined/closed? Or explicit decline?
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm transition-colors"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    )
}
