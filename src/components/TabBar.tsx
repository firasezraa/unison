import type { Route } from '../app/useHashRoute'
import { routeToHash } from '../app/useHashRoute'
import { HomeIcon, LibraryIcon, QueueIcon, SearchIcon } from '../icons'

export function TabBar({ route, onQueue }: { route: Route; onQueue: () => void }) {
  const items: Array<{ key: string; label: string; Icon: typeof HomeIcon; href?: string; onClick?: () => void; active: boolean }> = [
    { key: 'beranda', label: 'Beranda', Icon: HomeIcon, href: '#/', active: route.name === 'beranda' },
    { key: 'cari', label: 'Cari', Icon: SearchIcon, href: routeToHash({ name: 'cari' }), active: route.name === 'cari' },
    {
      key: 'library',
      label: 'Library',
      Icon: LibraryIcon,
      href: routeToHash({ name: 'library' }),
      active: route.name === 'library' || route.name === 'playlist',
    },
    { key: 'antrean', label: 'Antrean', Icon: QueueIcon, onClick: onQueue, active: false },
  ]

  return (
    <nav className="tab-bar" aria-label="Navigasi bawah">
      <div className="tab-bar__inner">
        {items.map(({ key, label, Icon, href, onClick, active }) =>
          href ? (
            <a key={key} className="tab-bar__link" href={href} aria-current={active ? 'page' : undefined}>
              <Icon />
              <span>{label}</span>
            </a>
          ) : (
            <button key={key} type="button" className="tab-bar__link" onClick={onClick}>
              <Icon />
              <span>{label}</span>
            </button>
          ),
        )}
      </div>
    </nav>
  )
}
