import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isGenericLandingRoute } from '../components/common/navigation'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    const isGeneric = isGenericLandingRoute(location.pathname)
    return (
      <Navigate
        to="/login"
        replace
        state={isGeneric ? undefined : { from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }

  return <Outlet />
}
