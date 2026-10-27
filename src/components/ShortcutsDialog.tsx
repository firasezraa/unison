import { useEffect, useRef } from 'react'
import { CloseIcon } from '../icons'

const SHORTCUTS: Array<[string, string]> = [
  ['Spasi', 'Putar atau jeda'],
  ['← / →', 'Mundur atau maju 5 detik'],
  ['Shift + ← / →', 'Lagu sebelumnya atau berikutnya'],
  ['↑ / ↓', 'Volume'],
  ['/', 'Fokus ke pencarian'],
  ['Q', 'Buka atau tutup antrean'],
  ['?', 'Daftar pintasan ini'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      triggerRef.current = document.activeElement as HTMLElement | null
      dialog.showModal()
      closeRef.current?.focus()
    }
    if (!open && dialog.open) {
      dialog.close()
      triggerRef.current?.focus()
    }
  }, [open])

  return (
    <dialog
      className="dialog"
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-label="Pintasan keyboard"
    >
      <div className="dialog__head">
        <h2 className="dialog__title">Pintasan keyboard</h2>
        <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Tutup">
          <CloseIcon />
        </button>
      </div>
      <ul className="shortcut-list">
        {SHORTCUTS.map(([keys, description]) => (
          <li key={keys}>
            <span>{description}</span>
            <kbd>{keys}</kbd>
          </li>
        ))}
      </ul>
    </dialog>
  )
}
