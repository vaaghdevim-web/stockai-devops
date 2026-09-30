import { getApiError } from '../../utils/apiError'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  Clock,
  Cog,
  Cpu,
  Gauge,
  Info,
  Radio,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  Zap,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAllMachines, getMachineById } from '../../api/machineApi'
import { getLatestTelemetry } from '../../api/telemetryApi'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import type { ActiveMachineResponse, TelemetryPacketRequest } from '../../types'

function getMachineStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase()
  if (s === 'RUNNING' || s === 'ACTIVE') return 'success'
  if (s === 'WARNING') return 'warning'
  if (s === 'FAULT' || s === 'ERROR' || s === 'EMERGENCY_STOP' || s === 'STOPPED') return 'danger'
  return 'neutral'
}

export function MachineDetailsPage() {
  const { machineCode: routeCode } = useParams<{ machineCode: string }>()
  const navigate = useNavigate()

  const [machine, setMachine] = useState<ActiveMachineResponse | null>(null)
  const [telemetry, setTelemetry] = useState<TelemetryPacketRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [telemetryNotFound, setTelemetryNotFound] = useState(false)

  const requestId = useRef(0)
  const [telemetryError, setTelemetryError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!routeCode) return
    const request = ++requestId.current
    setTelemetryError(null)
    setMachine(null)
    setTelemetry(null)
    setLoading(true)
    setError(null)
    setTelemetryNotFound(false)

    try {
      // 1. Fetch machine details using dedicated endpoints
      let found: ActiveMachineResponse | null = null
      const numericId = Number(routeCode)

      if (Number.isInteger(numericId) && numericId > 0) {
        try {
          found = await getMachineById(numericId)
        } catch {
          // Fall back to listing
        }
      }

      if (!found) {
        // Query machines to locate by machine code across all statuses
        const machineList = await getAllMachines()
        found =
          machineList.find(
            (m) =>
              m.machineCode.toLowerCase() === routeCode.toLowerCase() ||
              String(m.machineId) === routeCode
          ) || null
      }

      if (request !== requestId.current) return
      setMachine(found)

      // 2. Fetch latest telemetry reading for this machine
      const targetCode = found?.machineCode || routeCode
      try {
        const latest = await getLatestTelemetry(targetCode)
        if (request !== requestId.current) return
        setTelemetry(latest)
      } catch (error) {
        if (request !== requestId.current) return
        const details = getApiError(error, 'Unable to load telemetry.')
        // Backend returns 404 NOT_FOUND if no telemetry has been recorded yet for this machine
        setTelemetryNotFound(details.status === 404)
        if (details.status !== 404) setTelemetryError(details.message)
        setTelemetry(null)
      }
    } catch {
      if (request !== requestId.current) return
      setError('Unable to load machine details or latest telemetry data from the backend.')
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [routeCode])

  const invalidateRequest = useCallback(() => {
    requestId.current++
  }, [])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) void loadData()
    })
    return () => {
      active = false
      invalidateRequest()
    }
  }, [loadData, invalidateRequest])

  if (!routeCode) {
    return (
      <ErrorState
        title="Invalid Machine Code"
        description="No machine code parameter was specified in the URL."
        onRetry={() => navigate('/machines')}
        retryLabel="Return to Machines"
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Machine Specification — ${routeCode}`}
        description="Detailed machinery operational telemetry, sensor profiles, and unit status."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/machines')}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Machinery Registry
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/telemetry?machineCode=${encodeURIComponent(routeCode)}`)}
            >
              <Activity className="size-3.5" aria-hidden="true" />
              Live Telemetry Stream
            </Button>
          </div>
        }
      />

      {/* Backend Architecture Note */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-indigo-950 shadow-xs">
        <Info className="size-5 shrink-0 text-indigo-600 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-bold text-indigo-900">Equipment Operational Telemetry</p>
          <p className="mt-0.5 text-indigo-800 leading-relaxed font-medium">
            Displays confirmed registry properties and the latest server-ingested IoT telemetry packet for machine{' '}
            <strong className="font-mono">{routeCode}</strong>.
          </p>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Machine Details Error"
          description={error}
          onRetry={() => void loadData()}
          retryLabel="Retry"
        />
      )}

      {loading ? (
        <Card className="py-20 text-center">
          <LoadingSpinner label="Loading machine specification and telemetry..." size="lg" />
        </Card>
      ) : !machine && !telemetry && !telemetryError ? (
        <Card className="py-14 text-center">
          <EmptyState
            icon={<Cog className="size-10 text-slate-400" />}
            title="Machine Not Found"
            description={`Machine with code "${routeCode}" was not found in the active machine registry, and no telemetry has been recorded for it.`}
            action={
              <Button size="sm" onClick={() => navigate('/machines')}>
                Return to Machines Registry
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Machine Profile Identity Card */}
          <Card className="p-6 border-slate-200 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-mono font-bold text-base shadow-xs">
                  <Cog className="size-6 text-indigo-600" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black text-slate-900">
                      {machine?.machineName || telemetry?.machineType || routeCode}
                    </h2>
                    <StatusBadge
                      tone={getMachineStatusTone(
                        machine?.status || telemetry?.machineStatus || 'UNKNOWN'
                      )}
                    >
                      {machine?.status || telemetry?.machineStatus || 'UNKNOWN'}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-mono">
                    <span>
                      Code: <strong className="text-slate-900">{routeCode}</strong>
                    </span>
                    {machine?.unitId != null && (
                      <span>
                        Facility Unit: <strong className="text-slate-900">Unit #{machine.unitId}</strong>
                      </span>
                    )}
                    {machine?.machineId != null && (
                      <span>
                        Registry ID: <strong className="text-slate-900">#{machine.machineId}</strong>
                      </span>
                    )}
                    {telemetry?.plantId != null && (
                      <span>
                        Plant Ref: <strong className="text-slate-900">#{telemetry.plantId}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`/telemetry?machineCode=${encodeURIComponent(routeCode)}`)}
                  className="font-bold shadow-xs cursor-pointer"
                >
                  <Activity className="size-4" aria-hidden="true" />
                  Open Live Telemetry Stream
                </Button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Machine Code
                </span>
                <p className="mt-1 font-mono font-bold text-slate-900 text-sm">{routeCode}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Unit Assignment
                </span>
                <p className="mt-1 font-medium text-slate-900 text-sm">
                  {machine?.unitId != null ? `Unit #${machine.unitId}` : 'Main Factory Plant'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Sensor Firmware
                </span>
                <p className="mt-1 font-mono font-semibold text-slate-800 text-xs">
                  {telemetry?.sensorFirmwareVersion || 'Not reported'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Last Telemetry Packet
                </span>
                <p className="mt-1 font-mono font-semibold text-slate-800 text-xs truncate">
                  {telemetry?.packetTimestamp
                    ? new Date(telemetry.packetTimestamp).toLocaleTimeString()
                    : 'No packets received'}
                </p>
              </div>
            </div>
          </Card>

          {/* Latest Telemetry Reading Section */}
          {telemetryError ? (
            <ErrorState title="Telemetry Stream Unavailable" description={telemetryError} onRetry={loadData} />
          ) : telemetryNotFound ? (
            <Card className="p-6 border-2 border-amber-200 bg-amber-50/30">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
                  <Radio className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">No Telemetry Packets Ingested Yet</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    The backend telemetry ingestion service has not received sensor packets for equipment{' '}
                    <code className="font-mono font-bold text-slate-800">{routeCode}</code>. Once IoT sensors or
                    simulators transmit packets via the API, live sensor gauges and temperature curves will appear here.
                  </p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/telemetry?machineCode=${encodeURIComponent(routeCode)}`)}
                    >
                      <Activity className="size-3.5" aria-hidden="true" />
                      View Streaming Monitor
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : telemetry ? (
            <div className="space-y-6">
              {/* Primary Sensor Gauges */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Melt Pressure */}
                <Card className="p-4 border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Melt Pressure
                    </span>
                    <Gauge className="size-4 text-indigo-600" aria-hidden="true" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-black text-slate-900 tabular-nums">
                    {telemetry.meltPressureBar != null ? (
                      <>
                        {Number(telemetry.meltPressureBar).toFixed(1)}{' '}
                        <span className="text-xs font-bold text-slate-400">bar</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">Extrusion barrel pressure</p>
                </Card>

                {/* Screw Speed */}
                <Card className="p-4 border-l-4 border-l-indigo-600 border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Screw Speed
                    </span>
                    <Cpu className="size-4 text-indigo-600" aria-hidden="true" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-black text-indigo-950 tabular-nums">
                    {telemetry.screwRpm != null ? (
                      <>
                        {Number(telemetry.screwRpm).toFixed(0)}{' '}
                        <span className="text-xs font-bold text-slate-400">RPM</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">Rotational extruder velocity</p>
                </Card>

                {/* Line Speed / Loom */}
                <Card className="p-4 border-l-4 border-l-emerald-600 border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Line Velocity
                    </span>
                    <Activity className="size-4 text-emerald-600" aria-hidden="true" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-black text-emerald-950 tabular-nums">
                    {telemetry.lineSpeedMpm != null ? (
                      <>
                        {Number(telemetry.lineSpeedMpm).toFixed(1)}{' '}
                        <span className="text-xs font-bold text-slate-400">m/min</span>
                      </>
                    ) : telemetry.loomPpm != null ? (
                      <>
                        {Number(telemetry.loomPpm).toFixed(0)}{' '}
                        <span className="text-xs font-bold text-slate-400">PPM</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">
                    {telemetry.lineSpeedMpm != null ? 'Production line speed' : 'Loom picks per min'}
                  </p>
                </Card>

                {/* Active Power */}
                <Card className="p-4 border-l-4 border-l-purple-600 border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Active Power
                    </span>
                    <Zap className="size-4 text-purple-600" aria-hidden="true" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-black text-purple-950 tabular-nums">
                    {telemetry.activePowerKw != null ? (
                      <>
                        {Number(telemetry.activePowerKw).toFixed(2)}{' '}
                        <span className="text-xs font-bold text-slate-400">kW</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">Drive motor electrical load</p>
                </Card>
              </div>

              {/* 7-Zone Temperature Profile */}
              <Card className="p-6 border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Thermometer className="size-4 text-amber-500" aria-hidden="true" />
                    Extruder Temperature Profile (°C)
                  </h3>
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    7 Thermal Sensor Zones
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {[
                    { label: 'Zone 1 (Feed)', val: telemetry.zone1Temp },
                    { label: 'Zone 2 (Comp)', val: telemetry.zone2Temp },
                    { label: 'Zone 3 (Melt)', val: telemetry.zone3Temp },
                    { label: 'Zone 4 (Meter)', val: telemetry.zone4Temp },
                    { label: 'Zone 5 (Adapt)', val: telemetry.zone5Temp },
                    { label: 'Zone 6 (Filter)', val: telemetry.zone6Temp },
                    { label: 'Die Head', val: telemetry.dieTemp },
                  ].map((zone) => (
                    <div
                      key={zone.label}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-center"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-500 block truncate">
                        {zone.label}
                      </span>
                      <p className="mt-1 font-mono text-lg font-black text-slate-900 tabular-nums">
                        {zone.val != null ? (
                          <>
                            {Number(zone.val).toFixed(1)}
                            <span className="text-xs font-semibold text-slate-500">°C</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quality & Additional Sensor Metrics */}
              <Card className="p-6 border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
                    Quality & Edge Sensor Attributes
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 text-xs">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Measured GSM</span>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                      {telemetry.gsmMeasured != null ? `${telemetry.gsmMeasured} g/m²` : '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Fabric areal density</span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Denier Deviation
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                      {telemetry.denierDeviation != null ? `${telemetry.denierDeviation}` : '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Yarn linear mass variation</span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Tape Width</span>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                      {telemetry.tapeWidthMm != null ? `${telemetry.tapeWidthMm} mm` : '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Slit film width</span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Packet Sequence Number
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                      {telemetry.sequenceNumber != null ? `#${telemetry.sequenceNumber}` : '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Ingestion sequence counter</span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Sensor Edge Firmware
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900 truncate">
                      {telemetry.sensorFirmwareVersion || '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Edge controller version</span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Last Packet Timestamp
                    </span>
                    <p className="mt-1 font-mono text-xs font-semibold text-slate-900 flex items-center gap-1">
                      <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
                      {telemetry.packetTimestamp
                        ? new Date(telemetry.packetTimestamp).toLocaleString()
                        : '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Recorded packet date & time</span>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
