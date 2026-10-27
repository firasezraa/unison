import { useUnison } from '../app/UnisonContext'
import { PROVIDERS } from '../data/providers'
import { TrackRow } from '../components/TrackRow'
import { ShuffleIcon } from '../icons'

export function PlaylistView({ id }: { id: string }) {
  const { playlists, findTrack, playTrack, providerStatus, nowPlaying, notify } = useUnison()
  const playlist = playlists.find((item) => item.id === id)

  if (!playlist) {
    return (
      <div className="view">
        <header className="view__header">
          <h1 className="view__title">Playlist tidak ditemukan</h1>
          <p className="view__lede">Playlist mungkin sudah dihapus. Kembali ke library untuk melihat yang lain.</p>
          <div className="view__actions">
            <a className="btn btn--secondary" href="#/library/playlist">
              Kembali ke library
            </a>
          </div>
        </header>
      </div>
    )
  }

  const tracks = playlist.trackIds.map((trackId) => findTrack(trackId)).filter((track) => track !== undefined)
  const providers = Array.from(new Set(tracks.map((track) => track.provider)))

  return (
    <div className="view">
      <header className="view__header">
        <p className="view__eyebrow">Playlist</p>
        <h1 className="view__title">{playlist.name}</h1>
        <p className="view__lede">
          {tracks.length} lagu dari {providers.length} layanan · {playlist.description}
        </p>
        <div className="view__actions">
          <button type="button" className="btn btn--primary" onClick={() => playTrack(tracks[0], tracks)}>
            Putar
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              const shuffled = [...tracks].sort(() => Math.random() - 0.5)
              playTrack(shuffled[0], shuffled)
              notify('Playlist diacak.')
            }}
          >
            <ShuffleIcon style={{ width: 16, height: 16 }} /> Acak
          </button>
        </div>
        <div className="chip-row" style={{ marginTop: 'var(--s-4)' }}>
          {providers.map((provider) => (
            <span className="chip" key={provider} data-provider={provider}>
              <span className="badge" data-provider={provider}>
                {PROVIDERS[provider].code}
              </span>
              {PROVIDERS[provider].name}
            </span>
          ))}
        </div>
      </header>

      <ul className="row-list">
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            isCurrent={nowPlaying?.id === track.id}
            providerStatus={providerStatus(track.provider)}
            onPlay={() => playTrack(track, tracks)}
          />
        ))}
      </ul>
    </div>
  )
}
