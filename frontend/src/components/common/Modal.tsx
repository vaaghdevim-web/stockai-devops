import { useId, useRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export interface ModalProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'lg',
  children,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  const titleId = useId()
  useDialogFocus(isOpen, modalRef, onClose)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
        className={`relative z-10 w-full ${sizeClasses[size]} flex max-h-[calc(100dvh-2rem)] flex-col rounded-lg border border-slate-200 bg-white shadow-lg sm:max-h-[calc(100dvh-3rem)] ${className}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between rounded-t-lg border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
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
            aria-label="Close modal"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  )
}
