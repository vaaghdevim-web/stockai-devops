import { moduleTheme } from './moduleTheme'
import { Factory } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getNavigationForRoles } from './navigation'
import { useAuthStore } from '../../store/authStore'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onNavigate: () => void
}

export function Sidebar({ collapsed, mobileOpen, onNavigate }: SidebarProps) {
  const roles = useAuthStore((state) => state.roles)
  const visibleGroups = getNavigationForRoles(roles)

  return (
    <aside
      id="app-navigation"
      aria-label="Application navigation"
      className={`${mobileOpen ? 'block' : 'hidden'} border-r border-slate-800 bg-slate-900 text-slate-200 shadow-xl lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
    >
      <div className="hidden h-18 shrink-0 items-center gap-3.5 border-b border-slate-800 px-5 lg:flex">
        <div className="flex size-10 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
          <Factory className="size-5.5 shrink-0 text-sky-400" aria-hidden="true" />
        </div>
        <div className={collapsed ? 'hidden' : ''}>
          <p className="text-base font-bold tracking-tight text-white">StockAI</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sri Vidya Polymers</p>
        </div>
      </div>
      <nav className="max-h-[65dvh] space-y-5 overflow-y-auto px-3 py-5 lg:max-h-none lg:min-h-0 lg:flex-1" aria-label="Main">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className={`mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${collapsed ? 'lg:sr-only' : ''}`}>
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map(({ title, path, icon: Icon }) => (
                <li key={path}>
                  <NavLink
                    data-module={moduleTheme(path).color}
                    to={path}
                    end
                    onClick={onNavigate}
                    title={title}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-sky-400 ${
                        isActive
                          ? 'bg-slate-800 text-white shadow-xs border-l-3 border-sky-400 ring-1 ring-inset ring-slate-700'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="navigation-icon size-5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className={collapsed ? 'lg:sr-only' : ''}>{title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
