import { useCallback, useEffect, useState } from 'react'

export type Route =
  | { name: 'beranda' }
  | { name: 'cari' }
  | { name: 'library'; tab?: 'lagu' | 'album' | 'artis' | 'playlist' }
  | { name: 'playlist'; id: string }
  | { name: 'koneksi' }
  | { name: 'pengaturan' }

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '')
  const [head, tail] = clean.split('/')
  switch (head) {
    case '':
      return { name: 'beranda' }
    case 'cari':
      return { name: 'cari' }
    case 'library':
      return { name: 'library', tab: (tail as 'lagu' | undefined) ?? 'lagu' }
    case 'playlist':
      return tail ? { name: 'playlist', id: tail } : { name: 'library', tab: 'playlist' }
    case 'koneksi':
      return { name: 'koneksi' }
    case 'pengaturan':
      return { name: 'pengaturan' }
    default:
      return { name: 'beranda' }
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'beranda':
      return '#/'
    case 'cari':
      return '#/cari'
    case 'library':
      return route.tab ? `#/library/${route.tab}` : '#/library'
    case 'playlist':
      return `#/playlist/${route.id}`
    case 'koneksi':
      return '#/koneksi'
    case 'pengaturan':
      return '#/pengaturan'
  }
}

export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next)
    if (window.location.hash === hash) {
      setRoute(parse(hash))
      return
    }
    window.location.hash = hash
  }, [])

  return [route, navigate]
}
