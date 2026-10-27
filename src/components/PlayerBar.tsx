import { useUnison } from '../app/UnisonContext'
import { PROVIDERS } from '../data/providers'
import { formatTime } from '../state/playback'
import { ThreadProgress } from './ThreadProgress'
import { ProviderBadge } from './ProviderBadge'
import { Artwork } from './Artwork'
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, VolumeIcon } from '../icons'

export function TransportControls({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { nowPlaying, playback, toggle, next, previous, handoff, queue } = useUnison()
  const busy = handoff.phase === 'loading' || handoff.phase === 'warmup'
  const hasNext = queue.currentIndex < queue.items.length - 1
  const big = size === 'lg'

  return (
    <div className="player-bar__transport">
      <button
        type="button"
        className="icon-button"
        onClick={previous}
        aria-label="Lagu sebelumnya"
        title="Lagu sebelumnya"
        disabled={!nowPlaying}
      >
        <PrevIcon />
      </button>
      <button
        type="button"
        className={big ? 'play-button play-button--lg' : 'play-button'}
        onClick={toggle}
        aria-label={playback.isPlaying ? 'Jeda' : 'Putar'}
        aria-pressed={playback.isPlaying}
        disabled={!nowPlaying || busy}
      >
        {playback.isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={next}
        aria-label="Lagu berikutnya"
        title="Lagu berikutnya"
        disabled={!hasNext}
      >
        <NextIcon />
      </button>
    </div>
  )
}

export function PlayerBar() {
  const { nowPlaying, playback, handoff, seek, volume, setVolume } = useUnison()
  const provider = nowPlaying ? PROVIDERS[nowPlaying.provider] : null
  const loading = handoff.phase === 'loading'
  const status = handoff.message

  return (
    <footer className="player-bar" role="region" aria-label="Pemutar">
      <div className="player-bar__now">
        <span className="player-bar__art">
          {nowPlaying ? <Artwork track={nowPlaying} /> : <span className="artwork" aria-hidden="true" />}
        </span>
        <span className="player-bar__text">
          <span className="player-bar__title" dir="auto">
            {nowPlaying?.title ?? 'Belum ada yang diputar'}
          </span>
          <span className="player-bar__sub" dir="auto">
            {status ?? (nowPlaying ? nowPlaying.artist : 'Pilih lagu dari pencarian')}
          </span>
        </span>
        {nowPlaying && <ProviderBadge provider={nowPlaying.provider} />}
      </div>

      <TransportControls />

      <div className="player-bar__progress">
        <span className="player-bar__time">{formatTime(playback.positionMs)}</span>
        <ThreadProgress
          positionMs={playback.positionMs}
          durationMs={nowPlaying?.durationMs ?? 0}
          from={nowPlaying?.provider ?? null}
          to={handoff.to}
          loading={loading}
          onSeek={seek}
        />
        <span className="player-bar__time">{formatTime(nowPlaying?.durationMs ?? 0)}</span>
      </div>

      <div className="player-bar__right">
        <label className="volume">
          <VolumeIcon />
          <span className="sr-only">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            aria-label="Volume"
          />
        </label>
        <span className="source-picker">
          {provider ? `Putar dari: ${provider.name}` : 'Pilih lagu'}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {nowPlaying ? `${nowPlaying.title} — ${nowPlaying.artist}` : 'Tidak ada lagu yang diputar'}
      </p>
      <p className="sr-only" aria-live="polite">
        {status ?? ''}
      </p>
    </footer>
  )
}
