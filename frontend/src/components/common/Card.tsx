import type { ComponentPropsWithRef, ReactNode } from 'react'

export interface CardProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  contentClassName?: string
}

export function Card({
  title,
  description,
  actions,
  footer,
  contentClassName = '',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={`operations-card min-w-0 rounded-xl border border-slate-200/90 bg-white shadow-xs transition-shadow ${className}`}
    >
      {(title || description || actions) && (
        <div className="operations-card-heading flex flex-wrap items-start justify-between gap-3 rounded-t-xl border-b border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="break-words text-sm font-bold tracking-tight text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-4 sm:p-5 ${contentClassName}`}>{children}</div>
      {footer && (
        <div className="rounded-b-xl border-t border-slate-200 bg-slate-50/50 px-4 py-3 sm:px-5">
          {footer}
        </div>
      )}
    </div>
  )
}
