import { useId, useRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export interface DrawerProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: 'md' | 'lg' | 'xl'
  footer?: ReactNode
  children: ReactNode
}

const sizeClasses = {
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  size = 'lg',
  footer,
  children,
  className = '',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  const titleId = useId()
  useDialogFocus(isOpen, drawerRef, onClose)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full sm:pl-10">
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`relative w-screen ${sizeClasses[size]} border-l border-slate-200 bg-white shadow-lg flex flex-col ${className}`}
        >
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
            <div className="min-w-0 pr-4">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2>
              {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700 transition-colors"
              aria-label="Close drawer"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">{children}</div>

          {/* Optional Footer */}
          {footer && (
            <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 [&>div]:flex-wrap [&>div>div]:flex-wrap">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

