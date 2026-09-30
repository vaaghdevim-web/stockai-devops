/**
 * StockAI Centralized Role-Based Access Control (RBAC) System
 *
 * Master Sidebar Access Matrix definition, permission resolution,
 * and action-level authorization rules.
 */

export type NormalizedRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FACTORY_DIRECTOR'
  | 'PLANT_MGR'
  | 'PRODUCTION_MGR'
  | 'STORE_MGR'
  | 'PURCHASE_MGR'
  | 'QUALITY_MGR'
  | 'WAREHOUSE_EXEC'
  | 'DISPATCH_EXEC'
  | 'SUPERVISOR'
  | 'OPERATOR'
  | 'ACCOUNTS'

export type PermissionLevel =
  | 'FULL'
  | 'VIEW'
  | 'RECEIVE'
  | 'CREATE'
  | 'EXECUTE'
  | 'CALC_ONLY'
  | 'LOG_TEST'
  | 'NONE'

export type PageKey =
  // MAIN
  | 'dashboard'
  | 'alerts'
  // INSIGHTS
  | 'reports'
  | 'audit'
  | 'documents'
  | 'integrations'
  // INVENTORY
  | 'rawMaterials'
  | 'materialBatches'
  | 'trackBatch'
  // PROCUREMENT
  | 'needToBuy'
  // WAREHOUSE
  | 'digitalTwin'
  | 'moveStock'
  | 'pallets'
  // PRODUCTION
  | 'productionWork'
  | 'currentWork'
  | 'compoundingBom'
  // QUALITY
  | 'qualityCheck'
  | 'qcSpecifications'
  // DISPATCH
  | 'dispatch'
  // MACHINES
  | 'machines'
  | 'machineLiveStatus'

export const ALL_PAGE_KEYS: readonly PageKey[] = [
  'dashboard',
  'alerts',
  'reports',
  'audit',
  'documents',
  'integrations',
  'rawMaterials',
  'materialBatches',
  'trackBatch',
  'needToBuy',
  'digitalTwin',
  'moveStock',
  'pallets',
  'productionWork',
  'currentWork',
  'compoundingBom',
  'qualityCheck',
  'qcSpecifications',
  'dispatch',
  'machines',
  'machineLiveStatus',
] as const

export const ALL_NORMALIZED_ROLES: readonly NormalizedRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FACTORY_DIRECTOR',
  'PLANT_MGR',
  'PRODUCTION_MGR',
  'STORE_MGR',
  'PURCHASE_MGR',
  'QUALITY_MGR',
  'WAREHOUSE_EXEC',
  'DISPATCH_EXEC',
  'SUPERVISOR',
  'OPERATOR',
  'ACCOUNTS',
] as const

/**
 * Master Sidebar Access Matrix:
 * Maps each (PageKey x NormalizedRole) to its exact PermissionLevel.
 */
export const RBAC_MATRIX: Record<PageKey, Record<NormalizedRole, PermissionLevel>> = {
  // MAIN
  dashboard: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'VIEW',
    STORE_MGR: 'VIEW',
    PURCHASE_MGR: 'VIEW',
    QUALITY_MGR: 'VIEW',
    WAREHOUSE_EXEC: 'VIEW',
    DISPATCH_EXEC: 'VIEW',
    SUPERVISOR: 'VIEW',
    OPERATOR: 'NONE',
    ACCOUNTS: 'VIEW',
  },
  alerts: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'FULL',
    QUALITY_MGR: 'FULL',
    WAREHOUSE_EXEC: 'VIEW',
    DISPATCH_EXEC: 'VIEW',
    SUPERVISOR: 'FULL',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'VIEW',
  },

  // INSIGHTS
  reports: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'VIEW',
    PURCHASE_MGR: 'FULL',
    QUALITY_MGR: 'FULL',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'VIEW',
    SUPERVISOR: 'VIEW',
    OPERATOR: 'NONE',
    ACCOUNTS: 'FULL',
  },
  audit: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'VIEW',
    STORE_MGR: 'VIEW',
    PURCHASE_MGR: 'VIEW',
    QUALITY_MGR: 'FULL',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'VIEW',
    OPERATOR: 'NONE',
    ACCOUNTS: 'FULL',
  },
  documents: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'FULL',
    QUALITY_MGR: 'FULL',
    WAREHOUSE_EXEC: 'FULL',
    DISPATCH_EXEC: 'FULL',
    SUPERVISOR: 'FULL',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'FULL',
  },
  integrations: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'VIEW',
    PRODUCTION_MGR: 'NONE',
    STORE_MGR: 'NONE',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'NONE',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'NONE',
    OPERATOR: 'NONE',
    ACCOUNTS: 'NONE',
  },

  // INVENTORY
  rawMaterials: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'VIEW',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'VIEW',
    QUALITY_MGR: 'VIEW',
    WAREHOUSE_EXEC: 'FULL',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'RECEIVE',
    ACCOUNTS: 'VIEW',
  },
  materialBatches: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'VIEW',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'VIEW',
    QUALITY_MGR: 'VIEW',
    WAREHOUSE_EXEC: 'FULL',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'VIEW',
  },
  trackBatch: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'VIEW',
    QUALITY_MGR: 'FULL',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'NONE',
  },

  // PROCUREMENT
  needToBuy: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'NONE',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'FULL',
    QUALITY_MGR: 'NONE',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'NONE',
    ACCOUNTS: 'VIEW',
  },

  // WAREHOUSE
  digitalTwin: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'VIEW',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'NONE',
    WAREHOUSE_EXEC: 'FULL',
    DISPATCH_EXEC: 'VIEW',
    SUPERVISOR: 'FULL',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'NONE',
  },
  moveStock: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'NONE',
    WAREHOUSE_EXEC: 'FULL',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'CREATE',
    ACCOUNTS: 'NONE',
  },
  pallets: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'NONE',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'NONE',
    WAREHOUSE_EXEC: 'FULL',
    DISPATCH_EXEC: 'FULL',
    SUPERVISOR: 'FULL',
    OPERATOR: 'CREATE',
    ACCOUNTS: 'NONE',
  },

  // PRODUCTION
  productionWork: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'VIEW',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'VIEW',
    WAREHOUSE_EXEC: 'VIEW',
    DISPATCH_EXEC: 'VIEW',
    SUPERVISOR: 'FULL',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'NONE',
  },
  currentWork: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'VIEW',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'VIEW',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'EXECUTE',
    ACCOUNTS: 'NONE',
  },
  compoundingBom: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'VIEW',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'VIEW',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'CALC_ONLY',
    ACCOUNTS: 'NONE',
  },

  // QUALITY
  qualityCheck: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'VIEW',
    STORE_MGR: 'NONE',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'FULL',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'LOG_TEST',
    ACCOUNTS: 'NONE',
  },
  qcSpecifications: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'VIEW',
    STORE_MGR: 'NONE',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'FULL',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'VIEW',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'NONE',
  },

  // DISPATCH
  dispatch: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'FULL',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'FULL',
    PURCHASE_MGR: 'VIEW',
    QUALITY_MGR: 'VIEW',
    WAREHOUSE_EXEC: 'FULL',
    DISPATCH_EXEC: 'FULL',
    SUPERVISOR: 'FULL',
    OPERATOR: 'NONE',
    ACCOUNTS: 'VIEW',
  },

  // MACHINES
  machines: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'VIEW',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'NONE',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'NONE',
  },
  machineLiveStatus: {
    SUPER_ADMIN: 'FULL',
    ADMIN: 'FULL',
    FACTORY_DIRECTOR: 'VIEW',
    PLANT_MGR: 'FULL',
    PRODUCTION_MGR: 'FULL',
    STORE_MGR: 'VIEW',
    PURCHASE_MGR: 'NONE',
    QUALITY_MGR: 'VIEW',
    WAREHOUSE_EXEC: 'NONE',
    DISPATCH_EXEC: 'NONE',
    SUPERVISOR: 'FULL',
    OPERATOR: 'VIEW',
    ACCOUNTS: 'NONE',
  },
}

/**
 * Normalizes backend / arbitrary role strings to valid NormalizedRole.
 * Default-deny: returns null for unmapped or invalid roles.
 */
export function normalizeRole(role: string): NormalizedRole | null {
  if (!role || typeof role !== 'string') return null
  const cleaned = role.trim().toUpperCase().replace(/^ROLE_/, '')

  switch (cleaned) {
    case 'SUPER_ADMIN':
    case 'SUPERADMIN':
      return 'SUPER_ADMIN'
    case 'ADMIN':
    case 'ADMINISTRATOR':
      return 'ADMIN'
    case 'FACTORY_DIRECTOR':
    case 'DIRECTOR':
      return 'FACTORY_DIRECTOR'
    case 'PLANT_MGR':
    case 'PLANT_MANAGER':
    case 'PLANTMGR':
      return 'PLANT_MGR'
    case 'PRODUCTION_MGR':
    case 'PRODUCTION_MANAGER':
    case 'PRODUCTIONMGR':
      return 'PRODUCTION_MGR'
    case 'STORE_MGR':
    case 'STORE_MANAGER':
    case 'STOREMGR':
      return 'STORE_MGR'
    case 'PURCHASE_MGR':
    case 'PURCHASE_MANAGER':
    case 'PURCHASEMGR':
      return 'PURCHASE_MGR'
    case 'QUALITY_MGR':
    case 'QUALITY_MANAGER':
    case 'QUALITYMGR':
      return 'QUALITY_MGR'
    case 'WAREHOUSE_EXEC':
    case 'WAREHOUSE_EXECUTIVE':
    case 'WAREHOUSEEXEC':
      return 'WAREHOUSE_EXEC'
    case 'DISPATCH_EXEC':
    case 'DISPATCH_EXECUTIVE':
    case 'DISPATCHEXEC':
      return 'DISPATCH_EXEC'
    case 'SUPERVISOR':
      return 'SUPERVISOR'
    case 'OPERATOR':
      return 'OPERATOR'
    case 'ACCOUNTS':
    case 'ACCOUNTS_TEAM':
    case 'ACCOUNTANT':
      return 'ACCOUNTS'
    case 'MANAGER':
      return 'PLANT_MGR'
    default:
      return null
  }
}

/**
 * Normalizes an array of role strings, deduplicating valid NormalizedRoles.
 */
export function normalizeRoles(roles: readonly string[]): NormalizedRole[] {
  if (!Array.isArray(roles)) return []
  const normalizedSet = new Set<NormalizedRole>()
  for (const r of roles) {
    const norm = normalizeRole(r)
    if (norm) {
      normalizedSet.add(norm)
    }
  }
  return Array.from(normalizedSet)
}

/**
 * Numeric privilege weight for permission resolution when a user possesses multiple roles.
 */
const PERMISSION_WEIGHT: Record<PermissionLevel, number> = {
  FULL: 100,
  RECEIVE: 50,
  CREATE: 50,
  EXECUTE: 50,
  CALC_ONLY: 50,
  LOG_TEST: 50,
  VIEW: 10,
  NONE: 0,
}

/**
 * Resolves the effective permission for a given page across multiple assigned roles.
 * Default-deny: returns 'NONE' if no role provides access.
 */
export function getEffectivePermission(
  userRoles: readonly string[],
  pageKey: PageKey
): PermissionLevel {
  const normalized = normalizeRoles(userRoles)
  if (normalized.length === 0) return 'NONE'

  const pageRow = RBAC_MATRIX[pageKey]
  if (!pageRow) return 'NONE'

  let highestPerm: PermissionLevel = 'NONE'
  let highestWeight = 0

  for (const role of normalized) {
    const perm = pageRow[role] || 'NONE'
    const weight = PERMISSION_WEIGHT[perm] ?? 0
    if (weight > highestWeight) {
      highestWeight = weight
      highestPerm = perm
    } else if (weight === highestWeight && highestPerm === 'NONE') {
      highestPerm = perm
    }
  }

  return highestPerm
}

/**
 * Returns true if the user's roles grant non-NONE access to the page (visible in sidebar & route accessible).
 */
export function hasPageAccess(userRoles: readonly string[], pageKey: PageKey): boolean {
  return getEffectivePermission(userRoles, pageKey) !== 'NONE'
}

/**
 * Returns true if the user has FULL mutation access to the page.
 */
export function canMutate(userRoles: readonly string[], pageKey: PageKey): boolean {
  return getEffectivePermission(userRoles, pageKey) === 'FULL'
}

/**
 * Validates whether the user's effective permission covers a specific action.
 */
export function canPerformAction(
  userRoles: readonly string[],
  pageKey: PageKey,
  requiredLevel: PermissionLevel
): boolean {
  const perm = getEffectivePermission(userRoles, pageKey)
  if (perm === 'NONE') return false
  if (perm === 'FULL') return true
  if (requiredLevel === 'VIEW') return true
  return perm === requiredLevel
}

/**
 * Canonical landing route mapping per normalized role.
 */
export const ROLE_DEFAULT_ROUTES: Record<NormalizedRole, string> = {
  SUPER_ADMIN: '/dashboard',
  ADMIN: '/dashboard',
  FACTORY_DIRECTOR: '/dashboard',
  PLANT_MGR: '/dashboard',
  PRODUCTION_MGR: '/production',
  STORE_MGR: '/inventory/raw-materials',
  PURCHASE_MGR: '/procurement/reorder-recommendations',
  QUALITY_MGR: '/quality/inspections',
  WAREHOUSE_EXEC: '/warehouse/transfers',
  DISPATCH_EXEC: '/dispatch',
  SUPERVISOR: '/dashboard',
  OPERATOR: '/production',
  ACCOUNTS: '/reports',
}

/**
 * Priority order for resolving default landing route when a user has multiple roles.
 */
export const ROLE_PRIORITY_ORDER: readonly NormalizedRole[] = [
  'STORE_MGR',
  'PURCHASE_MGR',
  'PRODUCTION_MGR',
  'QUALITY_MGR',
  'WAREHOUSE_EXEC',
  'DISPATCH_EXEC',
  'ACCOUNTS',
  'OPERATOR',
  'SUPERVISOR',
  'PLANT_MGR',
  'FACTORY_DIRECTOR',
  'ADMIN',
  'SUPER_ADMIN',
] as const

/**
 * Computes the landing route for a list of user roles.
 */
export function getDefaultRouteForRoles(roles: readonly string[]): string {
  const normalized = normalizeRoles(roles)
  if (normalized.length === 0) return '/login'

  for (const priorityRole of ROLE_PRIORITY_ORDER) {
    if (normalized.includes(priorityRole)) {
      const route = ROLE_DEFAULT_ROUTES[priorityRole]
      return route
    }
  }

  return ROLE_DEFAULT_ROUTES[normalized[0]] || '/dashboard'
}
