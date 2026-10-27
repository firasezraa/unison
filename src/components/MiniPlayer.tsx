import { useUnison } from '../app/UnisonContext'
import { Artwork } from './Artwork'
import { PauseIcon, PlayIcon } from '../icons'

export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const { nowPlaying, playback, toggle, handoff } = useUnison()
  const busy = handoff.phase === 'loading' || handoff.phase === 'warmup'
  const ratio = nowPlaying ? Math.min(1, playback.positionMs / nowPlaying.durationMs) : 0

  return (
    <div
      className="mini-player"
      data-provider={nowPlaying?.provider}
      role="region"
      aria-label="Pemutar mini"
    >
      <div className="mini-player__progress" aria-hidden="true">
        <span style={{ width: `${ratio * 100}%` }} />
      </div>
      <button
        type="button"
        className="mini-player__art"
        onClick={onOpen}
        aria-label="Buka layar sedang diputar"
      >
        {nowPlaying ? <Artwork track={nowPlaying} /> : <span className="artwork" aria-hidden="true" />}
      </button>
      <button type="button" className="mini-player__text" onClick={onOpen}>
        <span className="mini-player__title" dir="auto">
          {nowPlaying?.title ?? 'Belum ada yang diputar'}
        </span>
        <span className="mini-player__sub" dir="auto">
          {handoff.message ?? (nowPlaying?.artist ?? 'Pilih lagu dari pencarian')}
        </span>
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={toggle}
        disabled={!nowPlaying || busy}
        aria-label={playback.isPlaying ? 'Jeda' : 'Putar'}
      >
        {playback.isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  )
}
