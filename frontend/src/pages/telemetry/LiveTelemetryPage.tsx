import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  Power,
  RefreshCw,
  Sliders,
  Thermometer,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getActiveMachines } from '../../api/machineApi'
import { Button, Card, EmptyState, PageHeader, StatusBadge } from '../../components/common'
import { useTelemetryStream } from '../../hooks/useTelemetryStream'
import type { ActiveMachineResponse } from '../../types'

function getStatusBadgeDetails(status: string): {
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  icon: typeof Wifi
  label: string
} {
  switch (status) {
    case 'Live':
      return { tone: 'success', icon: Wifi, label: 'Live updates on' }
    case 'Connecting':
      return { tone: 'warning', icon: Activity, label: 'Connecting…' }
    case 'Reconnecting':
      return { tone: 'warning', icon: RefreshCw, label: 'Reconnecting…' }
    case 'Disconnected':
    default:
      return { tone: 'neutral', icon: WifiOff, label: 'Disconnected' }
  }
}

export function LiveTelemetryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const selectedMachine = searchParams.get('machineCode') || ''
  const selectedUnit = searchParams.get('unit') || ''
  const [activeMachines, setActiveMachines] = useState<ActiveMachineResponse[]>([])

  // Hook handles SSE, stream tickets, reconnection, bounded memory history
  const {
    status: streamStatus,
    latestTelemetry,
    telemetryHistory,
    recentEvents,
    anomalies,
    error: streamError,
    connect,
    disconnect,
  } = useTelemetryStream({
    machineCode: selectedMachine || undefined,
    unit: selectedUnit || undefined,
    maxPoints: 30,
    enabled: true,
  })

  // Sync URL params when selections change
  const handleMachineChange = (code: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (code) nextParams.set('machineCode', code)
    else nextParams.delete('machineCode')
    setSearchParams(nextParams)
  }

  const handleUnitChange = (unit: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (unit) nextParams.set('unit', unit)
    else nextParams.delete('unit')
    setSearchParams(nextParams)
  }

  // Fetch active machines for the selector dropdown
  useEffect(() => {
    let isCancelled = false
    const fetchMachines = async () => {
      try {
        const data = await getActiveMachines()
        if (!isCancelled) {
          setActiveMachines(data)
        }
      } catch {
        // Non-fatal: user can still input machine code manually
      }
    }
    void fetchMachines()
    return () => {
      isCancelled = true
    }
  }, [])

  // Transform bounded telemetry history into clean chart series (nulls safely handled)
  const chartData = useMemo(() => {
    return telemetryHistory.map((packet, idx) => {
      let timeLabel = `#${idx + 1}`
      try {
        if (packet.packetTimestamp) {
          const d = new Date(packet.packetTimestamp)
          timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
      } catch {
        // Fallback to index
      }

      return {
        timestamp: timeLabel,
        machineCode: packet.machineCode,
        zone1: packet.zone1Temp != null ? Number(packet.zone1Temp) : null,
        zone2: packet.zone2Temp != null ? Number(packet.zone2Temp) : null,
        zone3: packet.zone3Temp != null ? Number(packet.zone3Temp) : null,
        zone4: packet.zone4Temp != null ? Number(packet.zone4Temp) : null,
        zone5: packet.zone5Temp != null ? Number(packet.zone5Temp) : null,
        zone6: packet.zone6Temp != null ? Number(packet.zone6Temp) : null,
        die: packet.dieTemp != null ? Number(packet.dieTemp) : null,
        meltPressure: packet.meltPressureBar != null ? Number(packet.meltPressureBar) : null,
        screwRpm: packet.screwRpm != null ? Number(packet.screwRpm) : null,
        lineSpeed: packet.lineSpeedMpm != null ? Number(packet.lineSpeedMpm) : null,
        activePower: packet.activePowerKw != null ? Number(packet.activePowerKw) : null,
      }
    })
  }, [telemetryHistory])

  const statusBadge = getStatusBadgeDetails(streamStatus)
  const StatusIcon = statusBadge.icon

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machine Live Status"
        description="Real-time Server-Sent Events (SSE) telemetry feed with dynamic single-use ticket authorization and streaming sensor analytics."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {streamStatus === 'Disconnected' ? (
              <Button size="sm" onClick={connect}>
                <Power className="size-4" />
                Connect Stream
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={disconnect}>
                <Power className="size-4" />
                Disconnect
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={connect}
              title="Obtain fresh ticket and reconnect stream"
            >
              <RefreshCw className="size-4" />
              Reconnect
            </Button>
          </div>
        }
      />

      {/* Stream Status and Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-full ${
                streamStatus === 'Live'
                  ? 'bg-emerald-100 text-emerald-700 animate-pulse'
                  : streamStatus === 'Connecting' || streamStatus === 'Reconnecting'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              <StatusIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">SSE Stream:</span>
                <StatusBadge tone={statusBadge.tone}>{statusBadge.label}</StatusBadge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {streamStatus === 'Live'
                  ? 'Receiving telemetry frames in real time over SSE channel.'
                  : streamStatus === 'Reconnecting'
                    ? 'Session expired or dropped; renewing ticket from POST /api/v1/iot/telemetry/stream/ticket...'
                    : 'Stream is idle. Connect to begin listening.'}
              </p>
            </div>
          </div>

          {/* Machine & Unit Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="telemetry-machine-select" className="text-xs font-medium text-slate-600">Machine Filter:</label>
              <select
                id="telemetry-machine-select"
                value={selectedMachine}
                onChange={(e) => handleMachineChange(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">All Machines (Broadcast)</option>
                {activeMachines.map((m) => (
                  <option key={m.machineId} value={m.machineCode}>
                    {m.machineCode} — {m.machineName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="telemetry-unit-select" className="text-xs font-medium text-slate-600">Unit Filter:</label>
              <select
                id="telemetry-unit-select"
                value={selectedUnit}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">All Units</option>
                <option value="1">Unit 1 (Compounding & Extrusion)</option>
                <option value="2">Unit 2 (Circular Looms & Weaving)</option>
                <option value="3">Unit 3 (Conversion & Finishing)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert Banner */}
        {streamError && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-600 shrink-0" />
              <span>{streamError}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={connect}>
              Retry Connection
            </Button>
          </div>
        )}
      </Card>

      {/* Latest Frame Snapshot Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Machine Identity */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Target Machine</span>
            <Sliders className="size-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {latestTelemetry?.machineCode || (selectedMachine || 'Listening...')}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status</span>
            <StatusBadge tone={latestTelemetry?.machineStatus === 'RUNNING' ? 'success' : 'neutral'}>
              {latestTelemetry?.machineStatus || 'Awaiting Frame'}
            </StatusBadge>
          </div>
        </Card>

        {/* Extruder Melt Pressure */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Melt Pressure</span>
            <Gauge className="size-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {latestTelemetry?.meltPressureBar != null ? `${Number(latestTelemetry.meltPressureBar).toFixed(1)} bar` : '—'}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Die Temp</span>
            <span className="font-semibold text-slate-700">
              {latestTelemetry?.dieTemp != null ? `${Number(latestTelemetry.dieTemp).toFixed(1)} °C` : '—'}
            </span>
          </div>
        </Card>

        {/* Screw & Line Speed */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Screw RPM</span>
            <Activity className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {latestTelemetry?.screwRpm != null ? `${Number(latestTelemetry.screwRpm).toFixed(0)} RPM` : '—'}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Line Speed</span>
            <span className="font-semibold text-slate-700">
              {latestTelemetry?.lineSpeedMpm != null ? `${Number(latestTelemetry.lineSpeedMpm).toFixed(1)} m/min` : '—'}
            </span>
          </div>
        </Card>

        {/* Active Power Load */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Power</span>
            <Zap className="size-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {latestTelemetry?.activePowerKw != null ? `${Number(latestTelemetry.activePowerKw).toFixed(1)} kW` : '—'}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Operating Unit / PPM</span>
            <span className="font-semibold text-slate-700">
              {latestTelemetry?.loomPpm != null ? `${latestTelemetry.loomPpm} PPM` : (latestTelemetry?.unit ? `Unit ${latestTelemetry.unit}` : 'Active')}
            </span>
          </div>
        </Card>
      </div>

      {/* Real-time Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Extruder Zone Temperatures */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Thermometer className="size-5 text-amber-500" />
              <div>
                <h3 className="font-semibold text-slate-900">Extruder Temperature Profile</h3>
                <p className="text-xs text-slate-500">Real-time thermal tracking across Zones 1–6 and Die (°C)</p>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="py-20 text-center">
              <EmptyState
                title="Awaiting operational stream"
                description="Live temperature chart series will render automatically once telemetry packets arrive from edge PLCs."
              />
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '0.375rem', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="zone1" name="Zone 1" stroke="#ef4444" dot={false} strokeWidth={1.5} connectNulls />
                  <Line type="monotone" dataKey="zone2" name="Zone 2" stroke="#f97316" dot={false} strokeWidth={1.5} connectNulls />
                  <Line type="monotone" dataKey="zone3" name="Zone 3" stroke="#f59e0b" dot={false} strokeWidth={1.5} connectNulls />
                  <Line type="monotone" dataKey="zone4" name="Zone 4" stroke="#10b981" dot={false} strokeWidth={1.5} connectNulls />
                  <Line type="monotone" dataKey="zone5" name="Zone 5" stroke="#3b82f6" dot={false} strokeWidth={1.5} connectNulls />
                  <Line type="monotone" dataKey="zone6" name="Zone 6" stroke="#8b5cf6" dot={false} strokeWidth={1.5} connectNulls />
                  <Line type="monotone" dataKey="die" name="Die" stroke="#ec4899" dot={false} strokeWidth={2} strokeDasharray="3 3" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Melt Pressure and Active Power Dynamics */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gauge className="size-5 text-blue-500" />
              <div>
                <h3 className="font-semibold text-slate-900">Pressure & Power Dynamics</h3>
                <p className="text-xs text-slate-500">Melt pressure (bar) and active load (kW)</p>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="py-20 text-center">
              <EmptyState
                title="Awaiting operational stream"
                description="Live pressure and power telemetry will chart automatically as telemetry events arrive."
              />
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '0.375rem', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="meltPressure"
                    name="Melt Pressure (bar)"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#pressureGrad)"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="activePower"
                    name="Active Power (kW)"
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#powerGrad)"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="screwRpm"
                    name="Screw RPM"
                    stroke="#10b981"
                    dot={false}
                    strokeWidth={1.5}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Real-time Anomalies & Stream Log */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Anomalies Detected */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Machine Anomalies ({anomalies.length})
            </h3>
          </div>

          {anomalies.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-1" />
              <p className="font-medium text-slate-800">All Systems Nominal</p>
              <p className="text-xs text-slate-500 mt-0.5">No anomalies detected in the current telemetry window.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {anomalies.map((anom, idx) => (
                <div
                  key={`${anom.machineCode}-${anom.detectedAt || idx}-${idx}`}
                  className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-xs text-red-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{anom.anomalyType} — {anom.machineCode}</span>
                    <StatusBadge tone="danger">{anom.severity || 'Critical'}</StatusBadge>
                  </div>
                  <p className="mt-1 text-red-800">{anom.message}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 text-slate-600 text-[11px]">
                    {anom.parameterName && <span>Param: {anom.parameterName}</span>}
                    {anom.observedValue && <span>Observed: {anom.observedValue}</span>}
                    {anom.thresholdValue && <span>Threshold: {anom.thresholdValue}</span>}
                    {anom.detectedAt && (
                      <span>Time: {new Date(anom.detectedAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Live SSE Event Stream Feed */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="size-4 text-blue-500" />
              Recent Stream Packets ({recentEvents.length})
            </h3>
          </div>

          {recentEvents.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
              <Clock className="size-8 mx-auto text-slate-400 mb-1" />
              <p className="font-medium text-slate-800">No Stream Events Received Yet</p>
              <p className="text-xs text-slate-500 mt-0.5">Events broadcasted by the server will append here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {recentEvents.map((evt) => (
                <div
                  key={evt.eventId}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-2.5 text-xs hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {evt.telemetry?.machineCode || 'Telemetry Packet'}
                      </span>
                      <StatusBadge tone="neutral">{evt.eventType}</StatusBadge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Event ID: {evt.eventId.slice(0, 8)}... · Status: {evt.telemetry?.machineStatus || 'OK'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] text-slate-500">
                      {evt.publishedAt ? new Date(evt.publishedAt).toLocaleTimeString() : '—'}
                    </p>
                    {evt.telemetry?.machineCode && (
                      <button
                        type="button"
                        onClick={() => navigate(`/machines/${encodeURIComponent(evt.telemetry!.machineCode)}`)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                      >
                        Machine <ArrowRight className="size-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
