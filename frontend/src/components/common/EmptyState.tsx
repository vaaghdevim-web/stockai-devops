import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps extends Omit<ComponentPropsWithRef<'div'>, 'title' | 'children'> {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon = <Inbox className="size-8" />, action, className = '', ...props }: EmptyStateProps) {
  return (
    <div {...props} className={`flex flex-col items-center px-4 py-8 sm:px-6 sm:py-12 text-center ${className}`}>
      {icon && <div className="mb-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-500 shadow-2xs" aria-hidden="true">{icon}</div>}
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-600">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}
