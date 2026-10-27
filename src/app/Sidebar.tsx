import type { Route } from './useHashRoute'
import { routeToHash } from './useHashRoute'
import { useUnison } from './UnisonContext'
import {
  HomeIcon,
  LibraryIcon,
  LinkIcon,
  SearchIcon,
  SettingsIcon,
  UnisonMark,
} from '../icons'

const NAV = [
  { name: 'beranda' as const, label: 'Beranda', Icon: HomeIcon },
  { name: 'cari' as const, label: 'Cari', Icon: SearchIcon },
  { name: 'library' as const, label: 'Library', Icon: LibraryIcon },
  { name: 'koneksi' as const, label: 'Koneksi', Icon: LinkIcon },
]

export function Sidebar({ route }: { route: Route }) {
  const { playlists } = useUnison()

  return (
    <nav className="sidebar" aria-label="Navigasi utama">
      <a className="brand" href="#/">
        <UnisonMark className="brand__mark" />
        <span className="brand__word">unison</span>
      </a>

      <div className="nav">
        {NAV.map(({ name, label, Icon }) => (
          <a
            key={name}
            className="nav__link"
            href={routeToHash({ name } as Route)}
            aria-current={route.name === name ? 'page' : undefined}
            title={label}
          >
            <Icon className="nav__icon" />
            <span>{label}</span>
          </a>
        ))}
      </div>

      <div>
        <p className="nav__group-title">Playlist</p>
        <div className="nav">
          {playlists.map((playlist) => (
            <a
              key={playlist.id}
              className="nav__playlist"
              href={routeToHash({ name: 'playlist', id: playlist.id })}
              aria-current={route.name === 'playlist' && route.id === playlist.id ? 'page' : undefined}
              title={playlist.name}
            >
              {playlist.name}
            </a>
          ))}
        </div>
      </div>

      <div className="nav__spacer" />

      <a
        className="nav__link"
        href={routeToHash({ name: 'pengaturan' })}
        aria-current={route.name === 'pengaturan' ? 'page' : undefined}
        title="Pengaturan"
      >
        <SettingsIcon className="nav__icon" />
        <span>Pengaturan</span>
      </a>

      <p className="sidebar__note">Prototipe. Pemutaran disimulasikan, tanpa audio nyata.</p>
    </nav>
  )
}
