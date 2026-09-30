import { useEffect, useEffectEvent, type RefObject } from 'react'

const openDialogs: HTMLElement[] = []
let originalOverflow = ''

// Shared keyboard/focus lifecycle for the existing modal and drawer surfaces.
export function useDialogFocus(isOpen: boolean, ref: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const close = useEffectEvent(onClose)

  useEffect(() => {
    const dialog = ref.current
    if (!isOpen || !dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!openDialogs.length) {
      originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    openDialogs.push(dialog)
    const isTopDialog = () => openDialogs.at(-1) === dialog
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]',
    )).filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') &&
      !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
    const focusFirst = () => (focusable()[0] ?? dialog).focus({ preventScroll: true })

    function handleKeyDown(event: KeyboardEvent) {
      if (!isTopDialog() || event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        close()
      } else if (event.key === 'Tab') {
        const elements = focusable()
        const first = elements[0]
        const last = elements.at(-1)
        const active = document.activeElement
        if (!first) {
          event.preventDefault()
          dialog!.focus()
        } else if (!dialog!.contains(active) || active === dialog ||
          (event.shiftKey ? active === first : active === last)) {
          event.preventDefault()
          ;(event.shiftKey ? last : first)?.focus()
        }
      }
    }
    function handleFocusIn(event: FocusEvent) {
      if (isTopDialog() && event.target instanceof Node && !dialog!.contains(event.target)) focusFirst()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    focusFirst()
    return () => {
      const wasTop = isTopDialog()
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      openDialogs.splice(openDialogs.indexOf(dialog), 1)
      if (!openDialogs.length) document.body.style.overflow = originalOverflow
      if (wasTop && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [isOpen, ref])
}
