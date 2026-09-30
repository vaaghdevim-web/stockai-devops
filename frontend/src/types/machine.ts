export interface ActiveMachineResponse {
  machineId: number
  machineCode: string
  machineName: string
  status: string
  unitId: number
}

export interface MachineAnomalyDto {
  anomalyType: string
  severity: string
  machineCode: string
  parameterName: string
  thresholdValue: string
  observedValue: string
  message: string
  detectedAt: string
}
