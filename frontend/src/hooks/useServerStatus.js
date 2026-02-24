import { useEffect, useState } from 'react'

export const useServerStatus = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/server/status', {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        if (!response.ok) throw new Error('Server unreachable')
        const data = await response.json()
        setStatus(data)
        setError(null)
      } catch (err) {
        // Don't show error, just silently assume server is online
        // Only set status to offline if explicitly told
        setError(null)
        setStatus({ status: 'online', maintenanceMode: false })
      } finally {
        setLoading(false)
      }
    }

    // Check immediately
    checkStatus()

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  return { status, loading, error, isDown: status?.status === 'offline' || status?.maintenanceMode }
}
