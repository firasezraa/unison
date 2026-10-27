import { useEffect, useRef, useState } from 'react'
import { useUnison } from '../app/UnisonContext'
import { PROVIDERS } from '../data/providers'
import { formatTime } from '../state/playback'
import { Artwork } from './Artwork'
import { ProviderBadge } from './ProviderBadge'
import { ThreadProgress } from './ThreadProgress'
import { TransportControls } from './PlayerBar'
import { QueueContent } from './QueuePanel'
import { ChevronDownIcon } from '../icons'

export function NowPlayingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { nowPlaying, playback, handoff, seek } = useUnison()
  const [tab, setTab] = useState<'lagu' | 'antrean'>('lagu')
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const provider = nowPlaying ? PROVIDERS[nowPlaying.provider] : null

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Sedang diputar" ref={panelRef}>
      <div className="sheet__top">
        <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Tutup">
          <ChevronDownIcon />
        </button>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{provider?.name ?? 'Sedang diputar'}</span>
      </div>

      <div className="sheet__tabs" role="tablist" aria-label="Tampilan sedang diputar">
        <button
          type="button"
          role="tab"
          className="sheet__tab"
          aria-selected={tab === 'lagu'}
          onClick={() => setTab('lagu')}
        >
          Lagu
        </button>
        <button
          type="button"
          role="tab"
          className="sheet__tab"
          aria-selected={tab === 'antrean'}
          onClick={() => setTab('antrean')}
        >
          Antrean
        </button>
      </div>

      {tab === 'lagu' ? (
        <div className="sheet__body">
          <div className="sheet__art">
            {nowPlaying ? <Artwork track={nowPlaying} /> : <span className="artwork" aria-hidden="true" />}
          </div>
          <div className="sheet__info">
            <h2 className="sheet__title" dir="auto">
              {nowPlaying?.title ?? 'Belum ada yang diputar'}
            </h2>
            <p className="sheet__sub" dir="auto">
              <span>{nowPlaying?.artist ?? 'Pilih lagu dari pencarian'}</span>
              {nowPlaying && <ProviderBadge provider={nowPlaying.provider} />}
            </p>
            {handoff.message && <p className="sheet__sub">{handoff.message}</p>}
          </div>

          <div className="sheet__progress">
            <ThreadProgress
              positionMs={playback.positionMs}
              durationMs={nowPlaying?.durationMs ?? 0}
              from={nowPlaying?.provider ?? null}
              to={handoff.to}
              loading={handoff.phase === 'loading'}
              onSeek={seek}
            />
            <div className="sheet__times">
              <span>{formatTime(playback.positionMs)}</span>
              <span>{formatTime(nowPlaying?.durationMs ?? 0)}</span>
            </div>
          </div>

          <div className="sheet__transport">
            <TransportControls size="lg" />
          </div>

          <span className="source-picker">Putar dari: {provider?.name ?? '—'}</span>
        </div>
      ) : (
        <div style={{ padding: 'var(--s-4)' }}>
          <QueueContent />
        </div>
      )}
    </div>
  )
}
