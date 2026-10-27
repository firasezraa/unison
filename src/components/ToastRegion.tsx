import { useUnison } from '../app/UnisonContext'

export function ToastRegion() {
  const { toasts, dismissToast } = useUnison()

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id} role="status">
          <span className="toast__message">{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.onAction?.()
                dismissToast(toast.id)
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Tutup pemberitahuan"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
