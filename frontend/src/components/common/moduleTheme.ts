import { Activity, Bell, Boxes, ClipboardCheck, Factory, FileText, Package, ShoppingCart } from 'lucide-react'

/** Presentation only: does not define permissions or navigation destinations. */
export function moduleTheme(path: string) {
  if (path.startsWith('/inventory') || path === '/traceability') return { color: 'inventory', icon: Package }
  if (path.startsWith('/production')) return { color: 'production', icon: Factory }
  if (path.startsWith('/quality')) return { color: 'quality', icon: ClipboardCheck }
  if (path.startsWith('/machines') || path === '/telemetry') return { color: 'machines', icon: Activity }
  if (path.startsWith('/warehouse')) return { color: 'warehouse', icon: Boxes }
  if (path.startsWith('/procurement')) return { color: 'procurement', icon: ShoppingCart }
  if (path === '/alerts') return { color: 'alerts', icon: Bell }
  return { color: 'neutral', icon: FileText }
}
