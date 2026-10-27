import { useState } from 'react'
import { useUnison } from '../app/UnisonContext'
import { CATALOG } from '../data/catalog'
import { PROVIDERS, PROVIDER_LIST } from '../data/providers'
import type { ProviderId } from '../domain/types'
import { TrackRow } from '../components/TrackRow'
import { providerDelay } from '../state/search'

const TABS = [
  { key: 'lagu' as const, label: 'Lagu' },
  { key: 'album' as const, label: 'Album' },
  { key: 'artis' as const, label: 'Artis' },
  { key: 'playlist' as const, label: 'Playlist' },
]

export function LibraryView({ initialTab = 'lagu' }: { initialTab?: 'lagu' | 'album' | 'artis' | 'playlist' }) {
  const { playTrack, providerStatus, playlists } = useUnison()
  const [tab, setTab] = useState(initialTab)
  const [filter, setFilter] = useState<ProviderId | 'semua'>('semua')
  const [syncing, setSyncing] = useState(false)
  const [loaded, setLoaded] = useState(true)

  const tracks = CATALOG.filter((track) => filter === 'semua' || track.provider === filter)
  const albums = Array.from(new Map(tracks.map((track) => [track.album, track])).values())
  const artists = Array.from(new Map(tracks.map((track) => [track.artist, track])).values())

  const runSync = () => {
    setSyncing(true)
    setLoaded(true)
    const timer = window.setTimeout(() => setSyncing(false), 2200)
    return () => window.clearTimeout(timer)
  }

  return (
    <div className="view">
      <header className="view__header">
        <h1 className="view__title">Library</h1>
        <p className="view__lede">
          Impor baca-saja dari layanan yang terhubung. Di prototipe ini, library sudah terisi data contoh.
        </p>
        <div className="view__actions">
          <button type="button" className="btn btn--secondary" onClick={runSync} disabled={syncing}>
            {syncing ? 'Memuat…' : 'Muat ulang'}
          </button>
        </div>
        {syncing && (
          <div className="sync-status" role="status">
            {PROVIDER_LIST.filter((provider) => providerStatus(provider.id) === 'connected').map((provider) => (
              <span key={provider.id} className="tabular">
                {provider.name}: 400 dari 1.200 lagu
                <span className="sr-only">, diperkirakan selesai dalam {Math.round(providerDelay(provider.id) / 1000)} detik</span>
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="tab-row" role="tablist" aria-label="Jenis library">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            className="tab-row__tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="chip-row" aria-label="Filter layanan">
        <button
          type="button"
          className="chip"
          aria-pressed={filter === 'semua'}
          onClick={() => setFilter('semua')}
        >
          Semua layanan
        </button>
        {PROVIDER_LIST.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="chip"
            aria-pressed={filter === provider.id}
            onClick={() => setFilter(provider.id)}
          >
            <span className="badge" data-provider={provider.id}>
              {provider.code}
            </span>
            {provider.name}
          </button>
        ))}
      </div>

      {!loaded && (
        <div className="empty-state">
          <p className="empty-state__title">Library masih kosong.</p>
          <p className="empty-state__text">Muat library dari layanan yang terhubung.</p>
          <button type="button" className="btn btn--primary" onClick={runSync}>
            Muat library
          </button>
        </div>
      )}

      {loaded && tab === 'lagu' && (
        <ul className="row-list">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              providerStatus={providerStatus(track.provider)}
              onPlay={() => playTrack(track, tracks)}
            />
          ))}
        </ul>
      )}

      {loaded && tab === 'album' && (
        <ul>
          {albums.map((track) => (
            <li key={track.album}>
              <span className="link-row">
                <span className="link-row__art" aria-hidden="true" data-provider={track.provider}>
                  {PROVIDERS[track.provider].code}
                </span>
                <span>
                  <span className="link-row__title">{track.album}</span>
                  <span className="link-row__sub" style={{ display: 'block' }}>
                    {track.artist}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {loaded && tab === 'artis' && (
        <ul>
          {artists.map((track) => (
            <li key={track.artist}>
              <span className="link-row">
                <span className="link-row__art" aria-hidden="true">
                  {track.artist.slice(0, 1)}
                </span>
                <span>
                  <span className="link-row__title">{track.artist}</span>
                  <span className="link-row__sub" style={{ display: 'block' }}>
                    {PROVIDERS[track.provider].name}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {loaded && tab === 'playlist' && (
        <ul>
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <a className="link-row" href={`#/playlist/${playlist.id}`}>
                <span className="link-row__art" aria-hidden="true">
                  {playlist.trackIds.length}
                </span>
                <span>
                  <span className="link-row__title">{playlist.name}</span>
                  <span className="link-row__sub" style={{ display: 'block' }}>
                    {playlist.description}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
