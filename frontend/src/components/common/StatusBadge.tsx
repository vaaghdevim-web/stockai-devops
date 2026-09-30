import { CheckCircle2, AlertTriangle, CircleAlert, Info, Circle } from 'lucide-react'
import type { ComponentPropsWithRef } from 'react'

export interface StatusBadgeProps extends ComponentPropsWithRef<'span'> {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

const tones = {
  neutral: 'border-slate-300 bg-slate-100 text-slate-800',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  danger: 'border-rose-300 bg-rose-50 text-rose-900',
  info: 'border-sky-300 bg-sky-50 text-sky-900',
}

export function StatusBadge({ tone = 'neutral', className = '', children, ...props }: StatusBadgeProps) {
  const Icon = { neutral: Circle, success: CheckCircle2, warning: AlertTriangle, danger: CircleAlert, info: Info }[tone]
  return (
    <span {...props} className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold leading-4 tracking-tight shadow-2xs ${tones[tone]} ${className}`}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </span>
  )
}
