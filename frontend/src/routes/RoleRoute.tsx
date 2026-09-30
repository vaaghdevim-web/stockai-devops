import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { hasPageAccess, type PageKey } from '../config/rbac'
import { hasAnyRole } from '../utils/roles'

interface RoleRouteProps {
  pageKey?: PageKey
  allowedRoles?: readonly string[]
  children?: ReactNode
}

/**
 * Route guard that validates user permissions based on centralized RBAC.
 * Direct unauthorized access redirects immediately to /403 without rendering.
 */
export function RoleRoute({ pageKey, allowedRoles, children }: RoleRouteProps) {
  const roles = useAuthStore((state) => state.roles)

  let isAuthorized = false

  if (pageKey) {
    isAuthorized = hasPageAccess(roles, pageKey)
  } else if (allowedRoles && allowedRoles.length > 0) {
    isAuthorized = hasAnyRole(roles, allowedRoles)
  }

  if (!isAuthorized) {
    return <Navigate to="/403" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
