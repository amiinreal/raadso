import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children, isAuthenticated, requiredRole, userRole }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}
