import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Eye,
  EyeOff,
  Factory,
  KeyRound,
  Layers,
  LockKeyhole,
  ShieldCheck,
  User,
  Warehouse,
} from 'lucide-react'
import { Button } from '../components/common'
import { isAxiosError } from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { isMfaRequiredError, loginUser } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import { getLoginDestination } from '../components/common/navigation'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((state) => state.setAuth)

  // Step 1 state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Step 2 state (MFA)
  const [isMfaStep, setIsMfaStep] = useState(false)
  const [totpCode, setTotpCode] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleInitialLogin(event: React.FormEvent) {
    event.preventDefault()

    if (loading) return

    setError('')
    setLoading(true)

    try {
      const response = await loginUser({
        usernameOrEmail: username.trim(),
        password,
      })

      const token = response.token

      if (!token) {
        throw new Error('No access token returned by backend')
      }

      setAuth(token, response.roles, {
        refreshToken: response.refreshToken,
        userName: response.userName,
      })

      const from: unknown = location.state?.from
      const destination = getLoginDestination(from, useAuthStore.getState().roles)

      navigate(destination, { replace: true })
    } catch (err) {
      if (isMfaRequiredError(err)) {
        // Backend indicated MFA is required for this account
        setIsMfaStep(true)
        setTotpCode('')
        setError('')
      } else if (isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0)) {
        const backendMsg = (err.response?.data as { message?: string })?.message
        setError(backendMsg || 'Invalid username or password. Please try again.')
      } else if (isAxiosError(err) && !err.response) {
        setError('Unable to connect to the manufacturing server. Please check your network connection.')
      } else {
        setError('Unable to sign in. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMfaVerify(event: React.FormEvent) {
    event.preventDefault()

    const sanitizedTotp = totpCode.trim()
    if (!sanitizedTotp || sanitizedTotp.length !== 6) {
      setError('Please enter a valid 6-digit authentication code.')
      return
    }

    if (loading) return

    setError('')
    setLoading(true)

    try {
      const response = await loginUser({
        usernameOrEmail: username.trim(),
        password,
        totpCode: sanitizedTotp,
      })

      const token = response.token

      if (!token) {
        throw new Error('No access token returned by backend')
      }

      setAuth(token, response.roles, {
        refreshToken: response.refreshToken,
        userName: response.userName,
      })

      const from: unknown = location.state?.from
      const destination = getLoginDestination(from, useAuthStore.getState().roles)

      navigate(destination, { replace: true })
    } catch (err) {
      if (isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0)) {
        const backendMsg = (err.response?.data as { message?: string })?.message
        if (backendMsg && /invalid.*mfa|invalid.*totp|mfa.*6-digit/i.test(backendMsg)) {
          setError('Invalid authentication code. Please check your authenticator app and enter the current 6-digit code.')
        } else {
          setError(backendMsg || 'Authentication verification failed. Please try again.')
        }
      } else if (isAxiosError(err) && !err.response) {
        setError('Unable to connect to the manufacturing server. Please check your network connection.')
      } else {
        setError('Authentication verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleBackToSignIn() {
    setIsMfaStep(false)
    setTotpCode('')
    setError('')
  }

  function handleTotpChange(value: string) {
    // Only allow numbers, maximum 6 digits
    const numericOnly = value.replace(/\D/g, '').slice(0, 6)
    setTotpCode(numericOnly)
    if (error) setError('')
  }

  function handleTotpPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pastedText = event.clipboardData.getData('text')
    const numericOnly = pastedText.replace(/\D/g, '').slice(0, 6)
    if (numericOnly) {
      setTotpCode(numericOnly)
      if (error) setError('')
    }
  }

  return (
    <main className="min-h-screen bg-slate-100/80 lg:grid lg:grid-cols-12">
      {/* Industrial Left Hero Column */}
      <section
        aria-label="Sri Vidya Polymers Industrial Control System"
        className="relative isolate flex flex-col justify-between overflow-hidden bg-slate-900 px-6 py-10 text-white sm:px-12 lg:col-span-6 lg:min-h-screen lg:px-14 lg:py-14 xl:col-span-7 xl:px-20"
      >
        {/* Subtle Industrial Grid Background */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-15">
          <div className="absolute inset-y-0 left-1/4 border-l border-slate-600" />
          <div className="absolute inset-y-0 left-2/4 border-l border-slate-600" />
          <div className="absolute inset-y-0 left-3/4 border-l border-slate-600" />
          <div className="absolute inset-x-0 top-1/3 border-t border-slate-600" />
          <div className="absolute inset-x-0 top-2/3 border-t border-slate-600" />
        </div>

        {/* Top Branding */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 shadow-xs">
              <Factory className="size-6 text-sky-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-white">
                StockAI<span className="text-sky-400">.</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Sri Vidya Polymers Pvt Ltd
              </p>
            </div>
          </div>
        </div>

        {/* Center Content / Headline */}
        <div className="my-10 max-w-xl lg:my-auto lg:py-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-300">
            <span className="size-2 rounded-full bg-sky-400" aria-hidden="true" />
            Plant Operations &amp; Inventory Intelligence
          </div>

          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl xl:text-[2.6rem]">
            Integrated manufacturing, inventory &amp; quality execution.
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            From raw polymer granules to precision extruded woven packaging. Real-time batch traceability, compounding recipes, warehouse storage twin, and laboratory clearance.
          </p>

          {/* Operational Module Badges */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <Boxes className="size-4 text-blue-400 shrink-0" aria-hidden="true" />
                <span className="text-xs font-bold">Raw Materials &amp; Batches</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Polymer resin lots, additives, safety stock &amp; barcode traceability.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <Layers className="size-4 text-amber-400 shrink-0" aria-hidden="true" />
                <span className="text-xs font-bold">Compounding &amp; Production</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                BOM formulation recipes, stage execution &amp; mass conservation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <Warehouse className="size-4 text-indigo-400 shrink-0" aria-hidden="true" />
                <span className="text-xs font-bold">Warehouse Digital Twin</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Grid bin allocation, internal transfers &amp; pallet dispatch.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <ShieldCheck className="size-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="text-xs font-bold">Quality Control Gate</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Incoming raw, in-process, and finished goods tolerance audit.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 pt-4 text-xs text-slate-400">
          <p>Unit 1 Manufacturing Facility · Hyderabad, Telangana · ERP Release 2026</p>
        </div>
      </section>

      {/* Right Column: Sign In / MFA Form */}
      <section
        aria-labelledby="login-form-heading"
        className="flex min-w-0 flex-col items-center justify-center px-5 py-12 sm:px-10 lg:col-span-6 lg:px-12 xl:col-span-5 xl:px-16"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xs sm:p-10">
          {!isMfaStep ? (
            /* STEP 1: USERNAME + PASSWORD */
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                  <LockKeyhole className="size-6 text-slate-800" aria-hidden="true" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Authorized Personnel Access
                </p>
                <h2 id="login-form-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Sign In to StockAI
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter your assigned enterprise credentials to access plant operations.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleInitialLogin} className="space-y-4" aria-busy={loading}>
                <div>
                  <label
                    htmlFor="login-username"
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                  >
                    <User className="size-3.5 text-slate-400" aria-hidden="true" />
                    Username or Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-xs outline-none transition-colors hover:border-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600"
                    placeholder="Enter username (e.g. operator, admin)"
                    aria-describedby={error ? 'login-error' : undefined}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                  >
                    <LockKeyhole className="size-3.5 text-slate-400" aria-hidden="true" />
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-12 text-sm text-slate-900 placeholder-slate-400 shadow-xs outline-none transition-colors hover:border-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600"
                      placeholder="Enter password"
                      aria-describedby={error ? 'login-error' : undefined}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-1 right-1 flex size-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-sky-600"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    id="login-error"
                    role="alert"
                    className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  loading={loading}
                  className="mt-2 w-full min-h-[44px]"
                >
                  {loading ? 'Authenticating...' : 'Sign in to Operations'}
                  {!loading && <ArrowRight className="size-4" aria-hidden="true" />}
                </Button>
                <span role="status" className="sr-only">
                  {loading ? 'Authenticating. Please wait.' : ''}
                </span>
              </form>
            </>
          ) : (
            /* STEP 2: TWO-FACTOR AUTHENTICATION (MFA) */
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700">
                  <KeyRound className="size-6 text-sky-600" aria-hidden="true" />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 border border-sky-200">
                  <ShieldCheck className="size-3 text-sky-600" />
                  Two-Factor Authentication
                </div>
                <h2 id="login-form-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  Authentication Code
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the 6-digit security code generated by your authenticator app for account{' '}
                  <span className="font-semibold text-slate-800 font-mono">{username}</span>.
                </p>
              </div>

              {/* MFA Form */}
              <form onSubmit={handleMfaVerify} className="space-y-4" aria-busy={loading}>
                <div>
                  <label
                    htmlFor="login-totp"
                    className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
                  >
                    <span>Authentication Code <span className="text-red-500">*</span></span>
                    <span className="text-[11px] font-normal text-slate-400">6-digit TOTP</span>
                  </label>
                  <input
                    id="login-totp"
                    name="totpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    value={totpCode}
                    onChange={(event) => handleTotpChange(event.target.value)}
                    onPaste={handleTotpPaste}
                    className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-center font-mono text-xl font-bold tracking-widest text-slate-900 placeholder-slate-300 shadow-xs outline-none transition-colors hover:border-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600"
                    placeholder="000000"
                    aria-describedby={error ? 'login-mfa-error' : undefined}
                    required
                  />
                </div>

                {error && (
                  <div
                    id="login-mfa-error"
                    role="alert"
                    className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <Button
                    type="submit"
                    size="lg"
                    loading={loading}
                    disabled={totpCode.length !== 6 || loading}
                    className="w-full min-h-[44px]"
                  >
                    {loading ? 'Verifying Code...' : 'Verify & Sign In'}
                    {!loading && <ArrowRight className="size-4" aria-hidden="true" />}
                  </Button>

                  <button
                    type="button"
                    onClick={handleBackToSignIn}
                    disabled={loading}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50 transition-colors"
                  >
                    <ArrowLeft className="size-3.5 text-slate-500" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
                <span role="status" className="sr-only">
                  {loading ? 'Verifying code. Please wait.' : ''}
                </span>
              </form>
            </>
          )}

          {/* Compliance notice */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Access is restricted to authorized factory operators and staff. All transactions and stage logs are recorded for GMP compliance.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          StockAI Enterprise · Sri Vidya Polymers Pvt Ltd
        </p>
      </section>
    </main>
  )
}

