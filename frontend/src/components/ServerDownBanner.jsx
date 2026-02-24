import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export const ServerDownBanner = ({ isVisible: shouldShow = false }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosed, setIsClosed] = useState(false)

  useEffect(() => {
    if (shouldShow && !isClosed) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
      // Reset closed state when the error is resolved
      if (!shouldShow) {
        setIsClosed(false)
      }
    }
  }, [shouldShow, isClosed])

  const handleClose = () => {
    setIsClosed(true)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4 relative">
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition"
        aria-label="Close banner"
      >
        <X size={20} />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* English */}
        <div>
          <h3 className="font-bold text-red-800 mb-2">Server is Currently Down</h3>
          <p className="text-red-700 text-sm mb-2">
            We are experiencing technical difficulties and working hard to get everything back online.
          </p>
          <p className="text-red-700 text-sm font-semibold">
            We apologize for the inconvenience. Please try again in a few moments.
          </p>
        </div>

        {/* Somali */}
        <div>
          <h3 className="font-bold text-red-800 mb-2">Cillad ayaa jirta xagga server-ka</h3>
          <p className="text-red-700 text-sm mb-2">
            Waxaan la kulmeynaa dhibaatooyin farsamo waxaanan si adag uga shaqeyneynaa sidii aan wax walba ugu soo celin lahayn khadka.
          </p>
          <p className="text-red-700 text-sm font-semibold">
            Waan ka cudur daaraneynaa dhibka dhacay. Fadlan isku day mar kale dhowr daqiiqadood gudahood
          </p>
        </div>
      </div>
    </div>
  )
}
