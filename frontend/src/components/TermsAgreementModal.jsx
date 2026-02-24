import { useState } from 'react'

export function TermsAgreementModal({ onAgree }) {
    const [loading, setLoading] = useState(false)

    const handleAgree = async () => {
        if (loading) return
        setLoading(true)
        try {
            await onAgree()
            setLoading(false)
        } catch (err) {
            console.error('Failed to agree to terms:', err)
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Update to our Terms
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        We've updated our <a href="/privacy-policy" target="_blank" className="text-primary hover:underline font-medium">Privacy Policy</a> and <a href="#" className="text-primary hover:underline font-medium">Terms of Service</a>.
                        Please review and accept these changes to continue using the platform.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 text-sm text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800">
                        <p>
                            By clicking "I Agree & Continue", you acknowledge that you have read and understood our policies regarding how we process your data and protect your privacy.
                        </p>
                    </div>

                    <button
                        onClick={handleAgree}
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 rounded-xl shadow-sm transition-all transform active:scale-[0.99] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            'I Agree & Continue'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
