import {
  Activity,
  Bell,
  Boxes,
  Building2,
  ClipboardCheck,
  Compass,
  Factory,
  FileText,
  FlaskConical,
  GitFork,
  LayoutDashboard,
  Layers,
  Package,
  Settings,
  ShoppingCart,
  Sliders,
  Truck,
  Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  getDefaultRouteForRoles,
  hasPageAccess,
  type PageKey,
} from '../../config/rbac'

export { getDefaultRouteForRoles }

export interface NavigationItem {
  title: string
  path: string
  icon: LucideIcon
  pageKey: PageKey
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Main',
    items: [
      { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, pageKey: 'dashboard' },
      { title: 'Alerts', path: '/alerts', icon: Bell, pageKey: 'alerts' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { title: 'Reports', path: '/reports', icon: FileText, pageKey: 'reports' },
      { title: 'Audit & Compliance', path: '/audit', icon: ClipboardCheck, pageKey: 'audit' },
      { title: 'Document Center', path: '/documents', icon: FileText, pageKey: 'documents' },
      { title: 'Integrations', path: '/integrations', icon: Settings, pageKey: 'integrations' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { title: 'Raw Materials', path: '/inventory/raw-materials', icon: Package, pageKey: 'rawMaterials' },
      { title: 'Material Batches', path: '/inventory/batches', icon: Layers, pageKey: 'materialBatches' },
      { title: 'Track Batch', path: '/traceability', icon: GitFork, pageKey: 'trackBatch' },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { title: 'Need to Buy', path: '/procurement/reorder-recommendations', icon: ShoppingCart, pageKey: 'needToBuy' },
      { title: 'Suppliers', path: '/procurement/suppliers', icon: Building2, pageKey: 'needToBuy' },
    ],
  },
  {
    label: 'Warehouse',
    items: [
      { title: 'Digital Twin & Map', path: '/warehouse/map', icon: Compass, pageKey: 'digitalTwin' },
      { title: 'Move Stock', path: '/warehouse/transfers', icon: Truck, pageKey: 'moveStock' },
      { title: 'Pallets', path: '/warehouse/pallets', icon: Boxes, pageKey: 'pallets' },
    ],
  },
  {
    label: 'Production',
    items: [
      { title: 'Production Work', path: '/production', icon: Factory, pageKey: 'productionWork' },
      { title: 'Current Work', path: '/production/wip', icon: Workflow, pageKey: 'currentWork' },
      { title: 'Compounding BOM', path: '/production/bom', icon: FlaskConical, pageKey: 'compoundingBom' },
    ],
  },
  {
    label: 'Quality',
    items: [
      { title: 'Quality Check', path: '/quality/inspections', icon: ClipboardCheck, pageKey: 'qualityCheck' },
      { title: 'QC Specifications', path: '/quality/specifications', icon: Sliders, pageKey: 'qcSpecifications' },
    ],
  },
  {
    label: 'Dispatch',
    items: [
      { title: 'Dispatch', path: '/dispatch', icon: Truck, pageKey: 'dispatch' },
    ],
  },
  {
    label: 'Machines',
    items: [
      { title: 'Machines', path: '/machines', icon: Settings, pageKey: 'machines' },
      { title: 'Machine Live Status', path: '/telemetry', icon: Activity, pageKey: 'machineLiveStatus' },
    ],
  },
]

export const moduleNavigation: NavigationItem[] = navigationGroups
  .flatMap((group) => group.items)
  .filter((item) => item.path !== '/dashboard')

/**
 * Filter navigation groups based on the authenticated user's normalized roles.
 * Items with permission 'NONE' (—) are omitted from the DOM.
 * Categories with 0 authorized items are omitted completely.
 */
export function getNavigationForRoles(roles: readonly string[]): NavigationGroup[] {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPageAccess(roles, item.pageKey)),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * Map of static routes to their canonical PageKey.
 */
export const ROUTE_PAGE_KEY_MAP: Record<string, PageKey> = {
  '/dashboard': 'dashboard',
  '/alerts': 'alerts',
  '/reports': 'reports',
  '/audit': 'audit',
  '/documents': 'documents',
  '/integrations': 'integrations',
  '/inventory/raw-materials': 'rawMaterials',
  '/inventory/batches': 'materialBatches',
  '/traceability': 'trackBatch',
  '/procurement/reorder-recommendations': 'needToBuy',
  '/procurement/suppliers': 'needToBuy',
  '/warehouse/map': 'digitalTwin',
  '/warehouse/digital-twin': 'digitalTwin',
  '/warehouse/transfers': 'moveStock',
  '/warehouse/pallets': 'pallets',
  '/production': 'productionWork',
  '/production/wip': 'currentWork',
  '/production/bom': 'compoundingBom',
  '/quality/inspections': 'qualityCheck',
  '/quality/specifications': 'qcSpecifications',
  '/dispatch': 'dispatch',
  '/machines': 'machines',
  '/telemetry': 'machineLiveStatus',
}

/**
 * Resolves the PageKey for a given route pathname (including parameterized subroutes).
 * Returns null if route is unknown (default-deny).
 */
export function getPageKeyForRoute(pathname: string): PageKey | null {
  const cleanPath = pathname.split(/[?#]/)[0]
  if (ROUTE_PAGE_KEY_MAP[cleanPath]) {
    return ROUTE_PAGE_KEY_MAP[cleanPath]
  }
  if (cleanPath.startsWith('/production/') && cleanPath.includes('/stages/')) {
    return 'currentWork'
  }
  if (cleanPath.startsWith('/production/bom/') && cleanPath.includes('/requirements')) {
    return 'compoundingBom'
  }
  if (cleanPath.startsWith('/quality/inspections/')) {
    return 'qualityCheck'
  }
  if (cleanPath.startsWith('/machines/')) {
    return 'machines'
  }
  return null
}

/**
 * Checks if a route is a generic/root route that should not override role default landings.
 */
export function isGenericLandingRoute(pathname: string): boolean {
  return (
    !pathname ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/dashboard' ||
    pathname === '/403' ||
    pathname === '/unauthorized'
  )
}

/**
 * Validates whether the pathname is authorized for the given roles.
 * Default-deny: returns false if route is unknown or user role lacks permission.
 */
export function isAuthorizedRoute(pathname: string, roles: readonly string[]): boolean {
  const cleanPath = pathname.split(/[?#]/)[0]
  if (cleanPath === '/403' || cleanPath === '/unauthorized' || cleanPath === '/login') {
    return true
  }
  const pageKey = getPageKeyForRoute(cleanPath)
  if (!pageKey) return false
  return hasPageAccess(roles, pageKey)
}

/**
 * Resolves destination after login:
 * - If user attempted a genuine, authorized deep-link (e.g. /quality/specifications), preserve it.
 * - Generic routes or unauthorized paths fall back to the user's role-specific default route.
 */
export function getLoginDestination(from: unknown, roles: readonly string[]): string {
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    const pathname = from.split(/[?#]/)[0]
    if (!isGenericLandingRoute(pathname) && isAuthorizedRoute(pathname, roles)) {
      return from
    }
  }
  return getDefaultRouteForRoles(roles)
}
