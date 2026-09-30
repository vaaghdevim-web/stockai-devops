import type { ComponentPropsWithRef, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps extends Omit<ComponentPropsWithRef<'div'>, 'title' | 'children'> {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  retrying?: boolean
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again.',
  onRetry,
  retryLabel = 'Try again',
  retrying = false,
  className = '',
  ...props
}: ErrorStateProps) {
  return (
    <div {...props} className={`rounded-xl border border-rose-200 bg-rose-50/90 p-4 sm:p-5 shadow-2xs ${className}`}>
      <div role="alert" className="flex items-start gap-3">
        <AlertCircle className="size-5 shrink-0 text-rose-700 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-rose-950">{title}</h2>
          {description && <p className="mt-1 break-words text-sm leading-6 text-rose-900">{description}</p>}
        </div>
      </div>
      {onRetry && (
        <Button variant="secondary" className="mt-4 border-rose-300 text-rose-900 hover:bg-rose-100" onClick={onRetry} loading={retrying}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
