import { moduleTheme } from '../components/common/moduleTheme'
import {
  ArrowUpRight,
  Download,
  FileText,
  FolderOpen,
  Plug,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../components/common'
import { getNavigationForRoles } from '../components/common/navigation'
import { useAuthStore } from '../store/authStore'
import { downloadDocument, listDocuments } from '../api/documentsApi'
import type { StoredDocument } from '../api/documentsApi'
import { getApiError } from '../utils/apiError'

function ReportIcon({ path }: { path: string }) {
  const Icon = moduleTheme(path).icon
  return <Icon className="size-6 text-slate-700" aria-hidden="true" />
}

function ModuleLink({ path, label }: { path: string; label: string }) {
  const roles = useAuthStore((state) => state.roles)
  if (
    !getNavigationForRoles(roles).some((group) =>
      group.items.some((item) => item.path === path)
    )
  )
    return null
  return (
    <Link
      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 mt-2"
      to={path}
    >
      {label}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

const reports = [
  [
    'Raw Material Inventory',
    '/inventory/raw-materials',
    'Material master catalog, lot allocations, safety buffers, and warehouse stocks.',
  ],
  [
    'Production Execution',
    '/production',
    'Production runs, compounding recipe formulations, and recorded stage outputs.',
  ],
  [
    'Quality Clearance',
    '/quality/inspections',
    'Laboratory inspection records, parameter tolerances, and pass/fail audits.',
  ],
  [
    'Stock Transfers',
    '/warehouse/transfers',
    'Internal warehouse transfers, bin movements, and shipment dispatches.',
  ],
  [
    'Procurement Triggers',
    '/procurement/reorder-recommendations',
    'Automated raw material reorder recommendations and requisition vouchers.',
  ],
  [
    'Machinery Registry',
    '/machines',
    'Plant equipment status, edge telemetry parameters, and technical specifications.',
  ],
  [
    'Live Sensor Telemetry',
    '/telemetry',
    'Real-time SSE sensor stream, extruder thermal profiles, and pressure feeds.',
  ],
] as const

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <FileText className="size-6 text-slate-700" aria-hidden="true" />
            Operational Reports & Logs Hub
          </span>
        }
        description="Access verified operational data ledgers and production records directly from their respective source modules."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map(([title, path, description]) => (
          <Card key={path} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ReportIcon path={path} />
                  <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                </div>
                <StatusBadge tone="info">Source Module</StatusBadge>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{description}</p>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
              <ModuleLink
                path={path}
                label={`Open ${title === 'Procurement Triggers' ? 'Reorder' : title}`}
              />
              <span className="text-[11px] text-slate-400">Live Backend View</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <ShieldCheck className="size-6 text-slate-700" aria-hidden="true" />
            Audit &amp; Compliance Logs
          </span>
        }
        description="Centralized audit trail status, traceability checkpoints, and operational record governance."
      />

      <Card className="p-5">
        <EmptyState
          icon={<ShieldCheck className="size-10 text-slate-400" />}
          title="Centralized audit log endpoint not exposed by backend release"
          description="Operational change logs are recorded within individual modules (QC inspections, stock transfers, batch allocations). No separate unified audit extraction API is currently published."
        />
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-slate-900 text-sm mb-3">Operational History Quick Navigation</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="font-semibold text-slate-800 block">Traceability Matrix</span>
            <ModuleLink path="/traceability" label="Open Traceability" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="font-semibold text-slate-800 block">Quality Inspections</span>
            <ModuleLink path="/quality/inspections" label="View QC History" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="font-semibold text-slate-800 block">Stock Movements</span>
            <ModuleLink path="/warehouse/transfers" label="View Transfer History" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="font-semibold text-slate-800 block">Production Runs</span>
            <ModuleLink path="/production" label="View Production History" />
          </div>
        </div>
      </Card>
    </div>
  )
}

export function DocumentsPage() {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<{
    version: number
    data?: StoredDocument[]
    error?: string
  } | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const downloading = useRef(false)
  const loading = result?.version !== version

  useEffect(() => {
    let active = true
    void listDocuments()
      .then((data) => {
        if (active) setResult({ version, data })
      })
      .catch((error: unknown) => {
        if (active)
          setResult({
            version,
            error: getApiError(error, 'Document storage service unavailable.').message,
          })
      })
    return () => {
      active = false
    }
  }, [version])

  async function download(document: StoredDocument) {
    if (downloading.current) return
    downloading.current = true
    setBusy(document.documentId)
    setDownloadError(null)
    try {
      const blob = await downloadDocument(document.documentId)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.fileName.replace(/[\\/]/g, '_')
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setDownloadError(
        getApiError(
          error,
          'Download unavailable. The backend may restrict access to this file.'
        ).message
      )
    } finally {
      downloading.current = false
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <FolderOpen className="size-6 text-slate-700" aria-hidden="true" />
            Document Storage Center
          </span>
        }
        description="Stored object documentation, pallet barcode labels, and authenticated report downloads."
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => setVersion((value) => value + 1)}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh Documents
          </Button>
        }
      />

      <Card className="p-5" aria-busy={loading}>
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Stored Object Files</h2>
            <p className="text-xs text-slate-500">
              Authenticated files returned by the active backend document controller.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <LoadingSpinner label="Loading document repository…" />
          </div>
        ) : result?.error ? (
          <ErrorState
            title="Document Service Unavailable"
            description={result.error}
            onRetry={() => setVersion((value) => value + 1)}
          />
        ) : result?.data?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((doc) => (
              <div
                key={doc.documentId}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900" title={doc.fileName}>
                      {doc.fileName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {doc.category || 'General'} ·{' '}
                      {doc.sizeBytes != null ? `${doc.sizeBytes.toLocaleString()} B` : ''}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => void download(doc)}
                  aria-label={`Download ${doc.fileName}`}
                >
                  {busy === doc.documentId ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No stored documents returned"
            description="The document service returned zero files for your tenant."
          />
        )}

        {downloadError && (
          <div className="mt-4">
            <ErrorState title="Download failed" description={downloadError} />
          </div>
        )}
      </Card>
    </div>
  )
}

export function IntegrationsPage() {
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  const cameraAvailable = window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia)
  const configured = Boolean(import.meta.env.VITE_API_BASE_URL)

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <Plug className="size-6 text-slate-700" aria-hidden="true" />
            Integrations &amp; Subsystems
          </span>
        }
        description="System integration capability overview across edge telemetry, authentication, and barcode scanning hardware."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Plug className="size-4.5 text-blue-600" aria-hidden="true" />
                <span>Backend Spring Boot API</span>
              </div>
              <StatusBadge tone={configured ? 'info' : 'warning'}>
                {configured ? 'Configured' : 'Local Default'}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              REST controller services connected via Axios client with Bearer JWT injection.
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <ModuleLink path="/dashboard" label="Open Operations Dashboard" />
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Plug className="size-4.5 text-indigo-600" aria-hidden="true" />
                <span>Authentication &amp; RBAC</span>
              </div>
              <StatusBadge tone={authenticated ? 'success' : 'neutral'}>
                {authenticated ? 'Active Session' : 'Unauthenticated'}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Zustand persistent auth store with automated token refresh and role routing.
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <span className="text-[11px] text-slate-400">Secured via HTTP Authorization header</span>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Plug className="size-4.5 text-emerald-600" aria-hidden="true" />
                <span>IoT Telemetry &amp; SSE</span>
              </div>
              <StatusBadge tone="info">SSE EventStream</StatusBadge>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Single-use ticket authenticated Server-Sent Events stream for edge PLC telemetry.
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <ModuleLink path="/telemetry" label="Open Telemetry Stream" />
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Plug className="size-4.5 text-amber-600" aria-hidden="true" />
                <span>Barcode &amp; QR Scanning</span>
              </div>
              <StatusBadge tone={cameraAvailable ? 'success' : 'neutral'}>
                {cameraAvailable ? 'Camera API Active' : 'Keyboard Emulation Only'}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Code-128 and QR camera decoding via ZXing, with native support for USB handheld scanners.
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <ModuleLink path="/warehouse/pallets" label="Open Barcode Scanner" />
          </div>
        </Card>
      </div>
    </div>
  )
}
