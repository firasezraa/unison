import type { ProviderStatus, Track } from '../domain/types'
import { PROVIDERS } from '../data/providers'
import { formatTime } from '../state/playback'
import { Artwork } from './Artwork'
import { ProviderBadge } from './ProviderBadge'
import { ThreadBar } from './ThreadBar'
import { EqualsIcon, PlusIcon, PlayNextIcon, WarningIcon, CloseIcon } from '../icons'

interface TrackRowProps {
  track: Track
  index?: number
  isCurrent?: boolean
  providerStatus?: ProviderStatus
  onPlay: () => void
  onQueue?: () => void
  onPlayNext?: () => void
  onRemove?: () => void
  showProviderCode?: boolean
}

export function TrackRow({
  track,
  index,
  isCurrent = false,
  providerStatus,
  onPlay,
  onQueue,
  onPlayNext,
  onRemove,
  showProviderCode = true,
}: TrackRowProps) {
  const provider = PROVIDERS[track.provider]
  const needsReconnect = providerStatus === 'needs-reconnect'
  const blocked = !track.available || providerStatus === 'disconnected'

  const classes = ['track-row']
  if (isCurrent) classes.push('track-row--current')
  if (!track.available) classes.push('track-row--unavailable')

  return (
    <li className={classes.join(' ')} data-provider={track.provider}>
      <ThreadBar provider={track.provider} active={isCurrent} />
      <span className="track-row__gutter" aria-hidden="true">
        {isCurrent ? <EqualsIcon /> : (index ?? 0) + 1}
      </span>
      <button
        type="button"
        className="track-row__play"
        onClick={onPlay}
        disabled={blocked}
        aria-label={
          track.available
            ? `Putar ${track.title} oleh ${track.artist} dari ${provider.name}`
            : `Tidak tersedia: ${track.title} di ${provider.name}`
        }
      >
        <span className="track-row__art">
          <Artwork track={track} />
        </span>
        <span className="track-row__body">
          <span className="track-row__title" dir="auto">
            {track.title}
          </span>
          <span className="track-row__meta" dir="auto">
            {track.artist} · {track.album}
            {!track.available && ' · Tidak tersedia'}
          </span>
          {needsReconnect && (
            <span className="track-row__flag">
              <WarningIcon /> Sambung ulang
            </span>
          )}
        </span>
      </button>
      <span className="track-row__duration tabular" aria-hidden="true">
        {track.available ? formatTime(track.durationMs) : '—'}
      </span>
      <span className="track-row__badges">{showProviderCode && <ProviderBadge provider={track.provider} />}</span>
      <span className="track-row__actions">
        {onPlayNext && (
          <button
            type="button"
            className="icon-button"
            onClick={onPlayNext}
            aria-label={`Putar ${track.title} berikutnya`}
            title="Putar berikutnya"
          >
            <PlayNextIcon />
          </button>
        )}
        {onQueue && (
          <button
            type="button"
            className="icon-button"
            onClick={onQueue}
            aria-label={`Tambahkan ${track.title} ke antrean`}
            title="Tambah ke antrean"
          >
            <PlusIcon />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            className="icon-button"
            onClick={onRemove}
            aria-label={`Hapus ${track.title} dari antrean`}
            title="Hapus dari antrean"
          >
            <CloseIcon />
          </button>
        )}
      </span>
    </li>
  )
}
