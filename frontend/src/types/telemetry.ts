import type { MachineAnomalyDto } from './machine'

export interface TelemetryPacketRequest {
  machineCode: string
  plantId?: number | null
  unit?: string | null
  machineType?: string | null
  zone1Temp?: number | null
  zone2Temp?: number | null
  zone3Temp?: number | null
  zone4Temp?: number | null
  zone5Temp?: number | null
  zone6Temp?: number | null
  dieTemp?: number | null
  meltPressureBar?: number | null
  screwRpm?: number | null
  lineSpeedMpm?: number | null
  loomPpm?: number | null
  activePowerKw?: number | null
  gsmMeasured?: number | null
  denierDeviation?: number | null
  tapeWidthMm?: number | null
  machineStatus: string
  sequenceNumber?: number | null
  packetTimestamp: string
  sensorFirmwareVersion?: string | null
  crcCheck?: string | null
}

export interface TelemetryBurstRequest {
  gatewayId?: string | null
  batchTimestamp: string
  packets: TelemetryPacketRequest[]
}

export interface TelemetryIngestResponse {
  status: string
  processedCount: number
  acceptedCount: number
  anomalyCount: number
  ingestLatencyMs: number
  anomalies: MachineAnomalyDto[]
  ingestedAt: string
}

export interface TelemetryStreamEvent {
  eventId: string
  eventType: string
  telemetry: TelemetryPacketRequest | null
  anomalies: MachineAnomalyDto[]
  publishedAt: string
}

export interface TelemetryStreamTicketResponse {
  ticket: string
  expiresInSeconds: number
}
