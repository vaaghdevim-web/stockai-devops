import { moduleTheme } from '../components/common/moduleTheme'
import { useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Sidebar } from '../components/common/Sidebar'
import { useAuthStore } from '../store/authStore'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const userName = useAuthStore((state) => state.userName)
  const roles = useAuthStore((state) => state.roles)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  function handleNavigate() {
    setMobileOpen(false)
    mainRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:shadow-lg focus:outline-2 focus:outline-accent-700"
      >
        Skip to content
      </a>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`min-w-0 transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Header
          username={userName ?? undefined}
          roles={roles}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onToggleMobile={() => setMobileOpen((value) => !value)}
          onLogout={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        />
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={handleNavigate} />
        <main
          data-module={moduleTheme(location.pathname).color}
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="min-w-0 overflow-x-auto p-4 outline-none sm:p-6 lg:px-8 lg:py-6"
        >
          <div className="mx-auto w-full max-w-[1760px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
