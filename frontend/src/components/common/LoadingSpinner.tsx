import type { ComponentPropsWithRef } from 'react'
import { LoaderCircle } from 'lucide-react'

export interface LoadingSpinnerProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'size-4', md: 'size-6', lg: 'size-8' }

export function LoadingSpinner({ label = 'Loading…', size = 'md', className = '', ...props }: LoadingSpinnerProps) {
  return (
    <div role="status" aria-live="polite" {...props} className={`inline-flex min-h-11 items-center justify-center gap-3 text-sm font-medium leading-5 text-slate-700 ${className}`}>
      <LoaderCircle className={`shrink-0 animate-spin text-accent-700 motion-reduce:animate-none ${sizes[size]}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
