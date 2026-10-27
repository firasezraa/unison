import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { ProviderId } from '../domain/types'
import { spokenTime } from '../state/playback'

interface ThreadProgressProps {
  positionMs: number
  durationMs: number
  from: ProviderId | null
  to?: ProviderId | null
  loading?: boolean
  onSeek?: (positionMs: number) => void
  label?: string
  className?: string
}

export function ThreadProgress({
  positionMs,
  durationMs,
  from,
  to = null,
  loading = false,
  onSeek,
  label = 'Posisi pemutaran',
  className,
}: ThreadProgressProps) {
  const ref = useRef<HTMLDivElement>(null)
  const ratio = durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0

  const seekFromEvent = (clientX: number) => {
    const node = ref.current
    if (!node || !onSeek) return
    const rect = node.getBoundingClientRect()
    const next = ((clientX - rect.left) / rect.width) * durationMs
    onSeek(Math.max(0, Math.min(durationMs, next)))
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onSeek) return
    event.currentTarget.setPointerCapture(event.pointerId)
    seekFromEvent(event.clientX)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!onSeek || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    seekFromEvent(event.clientX)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSeek) return
    const step = 5000
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      event.stopPropagation()
      onSeek(Math.max(0, positionMs - step))
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      event.stopPropagation()
      onSeek(Math.min(durationMs, positionMs + step))
    }
    if (event.key === 'Home') {
      event.preventDefault()
      onSeek(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      onSeek(durationMs)
    }
  }

  return (
    <div
      ref={ref}
      className={`thread-progress ${className ?? ''}`.trim()}
      data-provider={from ?? undefined}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(durationMs / 1000)}
      aria-valuenow={Math.round(positionMs / 1000)}
      aria-valuetext={`${spokenTime(positionMs)} dari ${spokenTime(durationMs)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    >
      <span className="thread-progress__track">
        {loading && to ? (
          <span
            className="thread-progress__fill thread-progress__fill--blend"
            style={{
              width: '100%',
              ['--thread-from' as string]: `var(--t-${from ?? to})`,
              ['--thread-to' as string]: `var(--t-${to})`,
            }}
          />
        ) : (
          <span className="thread-progress__fill" style={{ width: `${ratio * 100}%` }} />
        )}
      </span>
    </div>
  )
}
