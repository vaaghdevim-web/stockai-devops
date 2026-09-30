import { useCallback, useEffect, useRef, useState } from 'react'
import { createTelemetryStreamTicket, getRecentTelemetryEvents } from '../api/telemetryApi'
import type { MachineAnomalyDto, TelemetryPacketRequest, TelemetryStreamEvent } from '../types'

export interface UseTelemetryStreamOptions {
  machineCode?: string
  unit?: string
  maxPoints?: number
  enabled?: boolean
}

export type StreamStatus = 'Connecting' | 'Live' | 'Reconnecting' | 'Disconnected'

export interface UseTelemetryStreamResult {
  status: StreamStatus
  latestTelemetry: TelemetryPacketRequest | null
  telemetryHistory: TelemetryPacketRequest[]
  recentEvents: TelemetryStreamEvent[]
  anomalies: MachineAnomalyDto[]
  error: string | null
  connect: () => void
  disconnect: () => void
}

export function useTelemetryStream(options: UseTelemetryStreamOptions = {}): UseTelemetryStreamResult {
  const { machineCode, unit, maxPoints = 30, enabled = true } = options

  const [status, setStatus] = useState<StreamStatus>('Disconnected')
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryPacketRequest | null>(null)
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPacketRequest[]>([])
  const [recentEvents, setRecentEvents] = useState<TelemetryStreamEvent[]>([])
  const [anomalies, setAnomalies] = useState<MachineAnomalyDto[]>([])
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const isManuallyClosedRef = useRef(false)
  const activeTicketAbortRef = useRef<AbortController | null>(null)
  const connectRef = useRef<() => Promise<void>>(async () => {})
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Append telemetry packet to rolling bounded history
  const appendTelemetry = useCallback((packet: TelemetryPacketRequest) => {
    if (!isMountedRef.current) return
    setLatestTelemetry(packet)
    setTelemetryHistory((prev) => {
      // Deduplicate by machineCode + packetTimestamp
      const isDup = prev.some(
        (p) => p.machineCode === packet.machineCode && p.packetTimestamp === packet.packetTimestamp
      )
      if (isDup) return prev
      const next = [...prev, packet]
      if (next.length > maxPoints) {
        return next.slice(next.length - maxPoints)
      }
      return next
    })
  }, [maxPoints])

  // Append stream event to recent list
  const appendStreamEvent = useCallback((event: TelemetryStreamEvent) => {
    if (!isMountedRef.current) return

    setRecentEvents((prev) => {
      const exists = prev.some((e) => e.eventId === event.eventId)
      if (exists) return prev
      const next = [event, ...prev]
      return next.slice(0, 50)
    })

    if (event.telemetry) {
      if (!machineCode || event.telemetry.machineCode?.toLowerCase() === machineCode.toLowerCase()) {
        appendTelemetry(event.telemetry)
      }
    }

    if (event.anomalies && event.anomalies.length > 0) {
      const relevantAnomalies = machineCode
        ? event.anomalies.filter((a) => a.machineCode?.toLowerCase() === machineCode.toLowerCase())
        : event.anomalies

      if (relevantAnomalies.length > 0) {
        setAnomalies((prev) => {
          const next = [...relevantAnomalies, ...prev]
          return next.slice(0, 30)
        })
      }
    }
  }, [appendTelemetry, machineCode])

  // Close active SSE connection and cancel pending requests
  const closeConnection = useCallback(() => {
    if (activeTicketAbortRef.current) {
      activeTicketAbortRef.current.abort()
      activeTicketAbortRef.current = null
    }

    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // Disconnect manually
  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true
    closeConnection()
    if (isMountedRef.current) {
      setStatus('Disconnected')
    }
  }, [closeConnection])

  // Start or restart connection
  const connect = useCallback(async () => {
    isManuallyClosedRef.current = false
    closeConnection()
    if (!isMountedRef.current) return

    setStatus('Connecting')
    setError(null)

    try {
      const abortController = new AbortController()
      activeTicketAbortRef.current = abortController

      // 1. Obtain single-use stream ticket (valid for 30 seconds)
      const ticketResponse = await createTelemetryStreamTicket(abortController.signal)
      activeTicketAbortRef.current = null
      if (isManuallyClosedRef.current || !isMountedRef.current) return

      const ticket = ticketResponse.ticket

      // 2. Build stream URL with ticket and optional filters
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
      const params = new URLSearchParams()
      params.set('ticket', ticket)
      if (machineCode && machineCode.trim()) {
        params.set('machineCode', machineCode.trim())
      }
      if (unit && unit.trim()) {
        params.set('unit', unit.trim())
      }

      const streamUrl = `${baseUrl}/api/v1/iot/telemetry/stream?${params.toString()}`

      // 3. Open SSE connection
      const es = new EventSource(streamUrl)
      eventSourceRef.current = es

      // Handle standard onopen as well as named CONNECTED handshake event
      es.onopen = () => {
        if (!isMountedRef.current) return
        setStatus('Live')
        setError(null)
      }

      es.addEventListener('CONNECTED', () => {
        if (!isMountedRef.current) return
        setStatus('Live')
        setError(null)
      })

      // Telemetry ingested event
      es.addEventListener('TELEMETRY_INGESTED', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as TelemetryStreamEvent
          appendStreamEvent(parsed)
          if (isMountedRef.current) {
            setStatus('Live')
          }
        } catch {
          // Ignore parse errors on malformed payloads
        }
      })

      // Anomaly detected event
      es.addEventListener('ANOMALY_DETECTED', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as TelemetryStreamEvent
          appendStreamEvent(parsed)
        } catch {
          // Ignore
        }
      })

      // Machine status change event
      es.addEventListener('MACHINE_STATUS_CHANGED', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as TelemetryStreamEvent
          appendStreamEvent(parsed)
        } catch {
          // Ignore
        }
      })

      // Generic message listener
      es.onmessage = (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as TelemetryStreamEvent
          if (parsed && typeof parsed === 'object' && ('telemetry' in parsed || 'eventType' in parsed)) {
            appendStreamEvent(parsed)
          }
        } catch {
          // Non-JSON or keep-alive message
        }
      }

      // Connection error / reconnect handler
      es.onerror = () => {
        if (isManuallyClosedRef.current || !isMountedRef.current) return

        // Close current emitter because ticket is consumed and invalid for retry
        es.close()
        eventSourceRef.current = null
        setStatus('Reconnecting')

        // Schedule reconnect with fresh ticket
        if (reconnectTimeoutRef.current !== null) {
          window.clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (!isManuallyClosedRef.current && isMountedRef.current) {
            void connectRef.current?.()
          }
        }, 4000)
      }
    } catch (err: unknown) {
      if (isManuallyClosedRef.current || !isMountedRef.current) return

      // If the request was aborted during unmount/cleanup, exit quietly
      const isCanceled =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'ERR_CANCELED')

      if (isCanceled) return

      const msg = err instanceof Error ? err.message : 'Failed to establish telemetry stream ticket'
      setError(msg)
      setStatus('Reconnecting')

      // Schedule retry with fresh ticket
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (!isManuallyClosedRef.current && isMountedRef.current) {
          void connectRef.current?.()
        }
      }, 5000)
    }
  }, [closeConnection, machineCode, unit, appendStreamEvent])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // Load initial recent events once on mount or when filter changes
  useEffect(() => {
    let isCancelled = false

    const loadInitialData = async () => {
      try {
        const events = await getRecentTelemetryEvents(20)
        if (isCancelled || !isMountedRef.current) return

        // Filter events by machineCode if specified
        const filtered = machineCode
          ? events.filter((ev) => ev.telemetry?.machineCode?.toLowerCase() === machineCode.toLowerCase())
          : events

        setRecentEvents(filtered)

        // Collect initial history points
        const packets: TelemetryPacketRequest[] = []
        filtered.forEach((ev) => {
          if (ev.telemetry) {
            packets.push(ev.telemetry)
          }
        })
        // Sort chronologically (oldest to newest for charts)
        packets.sort((a, b) => new Date(a.packetTimestamp).getTime() - new Date(b.packetTimestamp).getTime())
        setTelemetryHistory(packets.slice(-maxPoints))

        if (packets.length > 0) {
          setLatestTelemetry(packets[packets.length - 1])
        } else {
          setLatestTelemetry(null)
        }

        // Collect any initial anomalies
        const initialAnomalies: MachineAnomalyDto[] = []
        filtered.forEach((ev) => {
          if (ev.anomalies && ev.anomalies.length > 0) {
            initialAnomalies.push(...ev.anomalies)
          }
        })
        setAnomalies(initialAnomalies.slice(0, 30))
      } catch {
        // Non-fatal: live stream will populate as events arrive
      }
    }

    void loadInitialData()

    return () => {
      isCancelled = true
    }
  }, [machineCode, maxPoints])

  // Start live stream connection on mount or dependency change
  useEffect(() => {
    if (enabled) {
      void Promise.resolve().then(connect)
    } else {
      void Promise.resolve().then(disconnect)
    }

    return () => {
      closeConnection()
    }
  }, [enabled, machineCode, unit, connect, disconnect, closeConnection])

  return {
    status,
    latestTelemetry,
    telemetryHistory,
    recentEvents,
    anomalies,
    error,
    connect,
    disconnect,
  }
}
