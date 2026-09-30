import { ShieldAlert, ArrowLeft, Home } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/common'
import { useAuthStore } from '../store/authStore'
import { getDefaultRouteForRoles } from '../config/rbac'

export function AccessDeniedPage() {
  const navigate = useNavigate()
  const roles = useAuthStore((state) => state.roles)
  const homeRoute = getDefaultRouteForRoles(roles)

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200 p-8 text-center shadow-lg bg-white">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 mb-5">
          <ShieldAlert className="size-8" aria-hidden="true" />
        </div>

        <span className="inline-block rounded-md bg-rose-100 px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-rose-800">
          403
        </span>

        <h1 id="access-denied-title" className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          Access Denied
        </h1>

        <p id="access-denied-message" className="mt-2 text-sm text-slate-600 leading-relaxed">
          You do not have permission to access this page.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Go Back
          </Button>

          <Link to={homeRoute} className="inline-block">
            <Button
              variant="primary"
              size="md"
              className="w-full flex items-center justify-center gap-2"
            >
              <Home className="size-4" aria-hidden="true" />
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
