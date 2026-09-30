import type { ComponentPropsWithRef, ReactNode } from 'react'

export interface PageHeaderProps extends Omit<ComponentPropsWithRef<'header'>, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, actions, className = '', ...props }: PageHeaderProps) {
  return (
    <header {...props} className={`operations-page-heading flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-start xl:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2.5 [&>div]:flex-wrap">{actions}</div>}
    </header>
  )
}
