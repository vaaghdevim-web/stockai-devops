import type { ComponentPropsWithRef } from 'react'
import { LoaderCircle } from 'lucide-react'

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary: 'border-accent-700 bg-accent-700 text-white shadow-xs hover:border-accent-800 hover:bg-accent-800 active:bg-accent-900',
  secondary: 'border-slate-300 bg-white text-slate-800 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100',
  danger: 'border-red-700 bg-red-700 text-white shadow-xs hover:border-red-800 hover:bg-red-800 active:bg-red-900',
  ghost: 'border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
}

const sizes = {
  sm: 'min-h-11 px-3.5 py-2 text-xs font-semibold',
  md: 'min-h-11 px-4 py-2.5 text-sm font-semibold',
  lg: 'min-h-12 px-6 py-3 text-base font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || props['aria-busy']}
      className={`inline-flex max-w-full items-center justify-center gap-2 rounded-lg border text-center font-medium transition-all select-none active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  )
}
