export type AlertSeverity = 'critical' | 'warning' | 'info'
export interface OperationalAlert {
  id: string
  category: string
  severity: AlertSeverity
  title: string
  description: string
  timestamp?: string | null
  reference: string
  route: string
  status: string
}
export interface AlertSourceResult {
  alerts: OperationalAlert[] | null
  errors: string[]
}
