import { UnisonProvider } from './app/UnisonContext'
import { AuthProvider } from './auth/AuthContext'
import { AppShell } from './app/AppShell'
import { useHashRoute } from './app/useHashRoute'
import { HomeView } from './views/HomeView'
import { SearchView } from './views/SearchView'
import { LibraryView } from './views/LibraryView'
import { PlaylistView } from './views/PlaylistView'
import { ConnectionsView } from './views/ConnectionsView'
import { SettingsView } from './views/SettingsView'
import { AuthView } from './views/AuthView'

function Router() {
  const [route] = useHashRoute()

  if (route.name === 'masuk') return <AuthView />

  return (
    <AppShell route={route}>
      {route.name === 'beranda' && <HomeView />}
      {route.name === 'cari' && <SearchView />}
      {route.name === 'library' && <LibraryView initialTab={route.tab ?? 'lagu'} />}
      {route.name === 'playlist' && <PlaylistView id={route.id} />}
      {route.name === 'koneksi' && <ConnectionsView />}
      {route.name === 'pengaturan' && <SettingsView />}
    </AppShell>
  )
}

export default function App() {
  return (
    <UnisonProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </UnisonProvider>
  )
}
