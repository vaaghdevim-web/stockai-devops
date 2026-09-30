import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, User, X } from 'lucide-react'
import { formatRolesDisplayName } from '../../utils/roles'

interface HeaderProps {
  username?: string
  roles: readonly string[]
  collapsed: boolean
  mobileOpen: boolean
  onToggleSidebar: () => void
  onToggleMobile: () => void
  onLogout: () => void
}

export function Header({ username, roles, collapsed, mobileOpen, onToggleSidebar, onToggleMobile, onLogout }: HeaderProps) {
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose
  const MobileIcon = mobileOpen ? X : Menu

  return (
    <header className="flex min-h-18 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobile}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          aria-controls="app-navigation"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700 lg:hidden"
        >
          <MobileIcon className="size-5" />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="app-navigation"
          className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700 lg:flex"
        >
          <CollapseIcon className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-slate-900">
            StockAI <span className="text-slate-400 font-normal">/</span> <span className="font-semibold text-slate-700">Sri Vidya Polymers</span>
          </p>
          <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Factory Operations Control</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {(username || roles.length > 0) && (
          <div className="flex items-center gap-2.5 border-slate-200 pl-2 text-right">
            <div className="hidden sm:block">
              {username && <p className="truncate text-xs font-bold text-slate-900" title={username}>{username}</p>}
              {roles.length > 0 && (
                <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  {formatRolesDisplayName(roles)}
                </span>
              )}
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200" aria-hidden="true">
              <User className="size-4.5" />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700 transition-colors"
          aria-label="Log out"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  )
}
