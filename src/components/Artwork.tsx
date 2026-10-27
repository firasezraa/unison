import type { Track } from '../domain/types'
import { PROVIDERS } from '../data/providers'

export function Artwork({ track, className }: { track: Track; className?: string }) {
  const meta = PROVIDERS[track.provider]
  return (
    <span className={`artwork ${className ?? ''}`.trim()} data-provider={track.provider}>
      {track.artwork ? (
        <img src={track.artwork} alt={`Sampul ${track.album}`} loading="lazy" />
      ) : (
        <span aria-hidden="true">{meta.code}</span>
      )}
    </span>
  )
}
