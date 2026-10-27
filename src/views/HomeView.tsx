import { useUnison } from '../app/UnisonContext'
import { TrackRow } from '../components/TrackRow'
import { routeToHash } from '../app/useHashRoute'
import { MusicIcon } from '../icons'

export function HomeView() {
  const { lastPlayed, playlists, playTrack, queue, providers } = useUnison()

  return (
    <div className="view">
      <header className="view__header">
        <h1 className="view__title">Beranda</h1>
        <p className="view__lede">
          Satu pemutar untuk semua layanan yang kamu hubungkan. Mulai dari yang terakhir kamu dengar.
        </p>
      </header>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Lanjutkan mendengar</h2>
          <a className="btn btn--text" href={routeToHash({ name: 'cari' })}>
            Cari lagu
          </a>
        </div>
        {queue.items.length > 0 ? (
          <ul className="row-list">
            {queue.items.slice(0, 5).map((track, index) => (
              <TrackRow
                key={`${track.id}-${index}`}
                track={track}
                index={index}
                isCurrent={queue.currentIndex === index}
                onPlay={() => playTrack(track, queue.items)}
              />
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">Belum ada yang diputar.</p>
            <p className="empty-state__text">
              Cari lagu untuk memulai antrean pertamamu. Antrean boleh berisi lagu dari layanan berbeda.
            </p>
            <a className="btn btn--primary" href={routeToHash({ name: 'cari' })}>
              Cari lagu
            </a>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Playlist terbaru</h2>
        </div>
        <ul>
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <a className="link-row" href={routeToHash({ name: 'playlist', id: playlist.id })}>
                <span className="link-row__art" aria-hidden="true">
                  <MusicIcon />
                </span>
                <span>
                  <span className="link-row__title">{playlist.name}</span>
                  <span className="link-row__sub" style={{ display: 'block' }}>
                    {playlist.trackIds.length} lagu · {playlist.description}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {lastPlayed.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Baru diputar</h2>
          </div>
          <ul className="row-list">
            {lastPlayed.map((track) => (
              <TrackRow key={`history-${track.id}`} track={track} onPlay={() => playTrack(track)} />
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Layanan</h2>
          <a className="btn btn--text" href={routeToHash({ name: 'koneksi' })}>
            Kelola koneksi
          </a>
        </div>
        <div className="chip-row">
          {providers.map((provider) => (
            <span className="chip" key={provider.id}>
              <span className="badge" data-provider={provider.id}>
                {provider.code}
              </span>
              {provider.name}
              <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                {provider.status === 'connected'
                  ? 'Terhubung'
                  : provider.status === 'needs-reconnect'
                    ? 'Perlu sambung ulang'
                    : 'Belum terhubung'}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
