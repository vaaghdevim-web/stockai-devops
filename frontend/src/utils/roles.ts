import {
  ALL_NORMALIZED_ROLES,
  getDefaultRouteForRoles as rbacGetDefaultRouteForRoles,
  normalizeRole as rbacNormalizeRole,
  normalizeRoles as rbacNormalizeRoles,
  type NormalizedRole,
  ROLE_DEFAULT_ROUTES as RBAC_ROLE_DEFAULT_ROUTES,
  ROLE_PRIORITY_ORDER,
} from '../config/rbac'

export type BusinessRole =
  | 'SUPER_ADMIN'
  | 'FACTORY_DIRECTOR'
  | 'PLANT_MGR'
  | 'STORE_MGR'
  | 'PURCHASE_MGR'
  | 'PRODUCTION_MGR'
  | 'QUALITY_MGR'
  | 'WAREHOUSE_EXEC'
  | 'ACCOUNTS'
  | 'DISPATCH_EXEC'

export type LegacyRole = 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'OPERATOR'

export type AppRole = NormalizedRole | LegacyRole

export const BUSINESS_ROLES: readonly NormalizedRole[] = ALL_NORMALIZED_ROLES

export const BUSINESS_ROLE_PRIORITY: readonly NormalizedRole[] = ROLE_PRIORITY_ORDER

export const LEGACY_ROLES: readonly LegacyRole[] = [
  'ADMIN',
  'MANAGER',
  'SUPERVISOR',
  'OPERATOR',
] as const

export const ALL_SUPPORTED_ROLES: readonly string[] = ALL_NORMALIZED_ROLES

export const ROLE_DISPLAY_NAMES: Record<NormalizedRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  FACTORY_DIRECTOR: 'Factory Director',
  PLANT_MGR: 'Plant Manager',
  STORE_MGR: 'Store Manager',
  PURCHASE_MGR: 'Purchase Manager',
  PRODUCTION_MGR: 'Production Manager',
  QUALITY_MGR: 'Quality Manager',
  WAREHOUSE_EXEC: 'Warehouse Executive',
  ACCOUNTS: 'Accounts Team',
  DISPATCH_EXEC: 'Dispatch Executive',
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operator',
}

export const ROLE_DEFAULT_ROUTES = RBAC_ROLE_DEFAULT_ROUTES

/**
 * Normalizes backend role values (delegates to centralized RBAC).
 */
export function normalizeRole(role: string): string {
  const norm = rbacNormalizeRole(role)
  return norm ?? ''
}

/**
 * Normalizes an array of role values and deduplicates them.
 */
export function normalizeRoles(roles: readonly string[]): string[] {
  return rbacNormalizeRoles(roles)
}

/**
 * Returns the human-friendly display name for a role code.
 */
export function getRoleDisplayName(role: string): string {
  const normalized = rbacNormalizeRole(role)
  if (normalized && ROLE_DISPLAY_NAMES[normalized]) {
    return ROLE_DISPLAY_NAMES[normalized]
  }
  if (!role) return ''
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Returns formatted comma-separated display names for roles.
 */
export function formatRolesDisplayName(roles: readonly string[]): string {
  const normalized = rbacNormalizeRoles(roles)
  return normalized.map(getRoleDisplayName).filter(Boolean).join(', ')
}

/**
 * Returns the role-specific landing page for a single role.
 */
export function getDefaultRouteForRole(role: string): string {
  const normalized = rbacNormalizeRole(role)
  return normalized ? ROLE_DEFAULT_ROUTES[normalized] ?? '/dashboard' : '/login'
}

/**
 * Returns the role-specific landing page for a list of roles.
 */
export function getDefaultRouteForRoles(roles: readonly string[]): string {
  return rbacGetDefaultRouteForRoles(roles)
}

/**
 * Checks if user has any of the target roles (case-insensitive and prefix-insensitive).
 */
export function hasAnyRole(userRoles: readonly string[], targetRoles: readonly string[]): boolean {
  const normalizedUser = rbacNormalizeRoles(userRoles)
  const normalizedTarget = rbacNormalizeRoles(targetRoles)
  return normalizedUser.some((r) => normalizedTarget.includes(r))
}

/**
 * Permission helper for reorder recommendation approvals and PO generation.
 */
export function canApproveReorders(roles: readonly string[]): boolean {
  return hasAnyRole(roles, [
    'SUPER_ADMIN',
    'FACTORY_DIRECTOR',
    'PLANT_MGR',
    'PURCHASE_MGR',
    'STORE_MGR',
    'ADMIN',
    'SUPERVISOR',
  ])
}

/**
 * Permission helper for executing/completing stock transfers.
 */
export function canCompleteTransfers(roles: readonly string[]): boolean {
  return hasAnyRole(roles, [
    'SUPER_ADMIN',
    'FACTORY_DIRECTOR',
    'PLANT_MGR',
    'WAREHOUSE_EXEC',
    'STORE_MGR',
    'ADMIN',
    'SUPERVISOR',
  ])
}
