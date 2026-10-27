import { useState } from 'react'
import { useUnison } from '../app/UnisonContext'
import { PROVIDERS } from '../data/providers'
import { Artwork } from './Artwork'
import { TrackRow } from './TrackRow'
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, PlayNextIcon, WarningIcon } from '../icons'

export function QueueContent({ onNavigate }: { onNavigate?: () => void }) {
  const { queue, dispatchQueue, playAt, removeAt, providerStatus, demoFailHandoff, setDemoFailHandoff, skippedIds, findTrack } =
    useUnison()
  const [confirmClear, setConfirmClear] = useState(false)

  const current = queue.items[queue.currentIndex]
  const upcoming = queue.items.slice(queue.currentIndex + 1)
  const currentId = current?.id
  const skippedTracks = skippedIds
    .filter((id, position) => skippedIds.indexOf(id) === position)
    .filter((id) => id !== currentId && !upcoming.some((item) => item.id === id))
    .map((id) => findTrack(id))
    .filter((track): track is NonNullable<typeof track> => Boolean(track))
    .slice(0, 3)

  return (
    <div>
      <div className="queue-panel__head">
        <h2 className="queue-panel__title">Antrean</h2>
        {queue.items.length > 0 && (
          <button type="button" className="btn btn--text" onClick={() => setConfirmClear(true)}>
            Kosongkan
          </button>
        )}
      </div>

      {queue.items.length === 0 ? (
        <p className="empty-state__text">Antrean masih kosong. Tambahkan lagu dari pencarian atau playlist.</p>
      ) : (
        <>
          <section className="queue-section">
            <h3 className="queue-section__title">Sedang diputar</h3>
            {current && (
              <ul className="row-list">
                <TrackRow
                  track={current}
                  isCurrent
                  providerStatus={providerStatus(current.provider)}
                  onPlay={() => playAt(queue.currentIndex)}
                  onRemove={() => removeAt(queue.currentIndex)}
                />
              </ul>
            )}
          </section>

          <section className="queue-section">
            <h3 className="queue-section__title">Berikutnya</h3>
            {upcoming.length === 0 && <p className="empty-state__text">Tidak ada lagu berikutnya.</p>}
            <ul>
              {upcoming.map((track, offset) => {
                const index = queue.currentIndex + 1 + offset
                return (
                  <li className="queue-item" key={`${track.id}-${index}`}>
                    <span className="thread" data-provider={track.provider} aria-hidden="true" />
                    <span className="queue-item__art">
                      <Artwork track={track} />
                    </span>
                    <span className="queue-item__body">
                      <span className="queue-item__title" dir="auto">
                        {track.title}
                      </span>
                      <span className="queue-item__meta" dir="auto">
                        {track.artist} · {PROVIDERS[track.provider].code}
                        {!track.available && ' · Tidak tersedia'}
                        {providerStatus(track.provider) === 'needs-reconnect' && ' · Sambung ulang'}
                      </span>
                    </span>
                    <span className="queue-item__actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => dispatchQueue({ type: 'move', from: index, to: index - 1 })}
                        disabled={index === queue.currentIndex + 1}
                        aria-label={`Naikkan ${track.title}`}
                        title="Naikkan"
                      >
                        <ChevronUpIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => dispatchQueue({ type: 'move', from: index, to: index + 1 })}
                        disabled={index === queue.items.length - 1}
                        aria-label={`Turunkan ${track.title}`}
                        title="Turunkan"
                      >
                        <ChevronDownIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => dispatchQueue({ type: 'remove', index })}
                        aria-label={`Hapus ${track.title} dari antrean`}
                        title="Hapus"
                      >
                        <CloseIcon />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          {skippedTracks.length > 0 && (
            <section className="queue-section">
              <h3 className="queue-section__title">Dilewati</h3>
              <ul>
                {skippedTracks.map((track) => (
                  <li className="queue-item queue-item--skipped" key={`skipped-${track.id}`}>
                    <span className="thread thread--muted" data-provider={track.provider} aria-hidden="true" />
                    <span className="queue-item__art">
                      <Artwork track={track} />
                    </span>
                    <span className="queue-item__body">
                      <span className="queue-item__title" dir="auto">
                        {track.title}
                      </span>
                      <span className="queue-item__meta" dir="auto">
                        {track.artist} · {PROVIDERS[track.provider].code}
                      </span>
                      <span className="track-row__flag">
                        <WarningIcon /> Tidak bisa diputar
                      </span>
                    </span>
                    <span className="queue-item__actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => {
                          playAt(queue.items.findIndex((item) => item.id === track.id))
                        }}
                        disabled={!queue.items.some((item) => item.id === track.id)}
                        aria-label={`Coba putar ${track.title} lagi`}
                        title="Coba lagi"
                      >
                        <PlayNextIcon />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {confirmClear && (
        <div className="confirm-row" role="alertdialog" aria-label="Konfirmasi kosongkan antrean">
          <span style={{ flex: 1 }}>Kosongkan antrean? Ini tidak bisa dibatalkan.</span>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              dispatchQueue({ type: 'clear' })
              setConfirmClear(false)
            }}
          >
            Kosongkan
          </button>
          <button type="button" className="btn btn--text" onClick={() => setConfirmClear(false)}>
            Batal
          </button>
        </div>
      )}

      <div className="queue-panel__demo">
        <p className="demo-title">Kontrol demo</p>
        <label className="demo-row">
          <input
            type="checkbox"
            checked={demoFailHandoff}
            onChange={(event) => setDemoFailHandoff(event.target.checked)}
          />
          Paksa gagal saat pindah layanan (timeout 8 detik)
        </label>
        <p className="demo-row" style={{ color: 'var(--ink-muted)' }}>
          Saat nonaktif, pindah layanan berhasil dalam kurang dari satu detik.
        </p>
        {onNavigate && (
          <button
            type="button"
            className="btn btn--text"
            onClick={() => {
              onNavigate()
            }}
          >
            Tutup antrean
          </button>
        )}
      </div>
    </div>
  )
}
