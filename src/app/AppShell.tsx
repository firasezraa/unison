import { useEffect, useState, type ReactNode } from 'react'
import type { Route } from './useHashRoute'
import { useUnison } from './UnisonContext'
import { Sidebar } from './Sidebar'
import { PlayerBar } from '../components/PlayerBar'
import { QueueContent } from '../components/QueuePanel'
import { MiniPlayer } from '../components/MiniPlayer'
import { TabBar } from '../components/TabBar'
import { ToastRegion } from '../components/ToastRegion'
import { NowPlayingSheet } from '../components/NowPlayingSheet'
import { ShortcutsDialog } from '../components/ShortcutsDialog'
import { CloseIcon } from '../icons'

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { toggle, next, previous, seek, volume, setVolume, nowPlaying, playback } = useUnison()
  const [queueOpen, setQueueOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true

      if (event.key === 'Escape') {
        setQueueOpen(false)
        return
      }
      if (typing) return

      switch (event.key) {
        case ' ':
          event.preventDefault()
          toggle()
          break
        case 'ArrowRight':
          event.preventDefault()
          if (event.shiftKey) next()
          else seek(playback.positionMs + 5000)
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (event.shiftKey) previous()
          else seek(playback.positionMs - 5000)
          break
        case 'ArrowUp':
          event.preventDefault()
          setVolume(Math.min(1, Number((volume + 0.05).toFixed(2))))
          break
        case 'ArrowDown':
          event.preventDefault()
          setVolume(Math.max(0, Number((volume - 0.05).toFixed(2))))
          break
        case 'q':
        case 'Q':
          event.preventDefault()
          setQueueOpen((prev) => !prev)
          break
        case '?':
          event.preventDefault()
          setShortcutsOpen((prev) => !prev)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, playback.positionMs, previous, seek, setVolume, toggle, volume])

  return (
    <>
      <div className="app-shell">
        <Sidebar route={route} />
        <main className="main" id="konten">
          {children}
        </main>
        <aside className="queue-aside" aria-label="Antrean">
          <QueueContent />
        </aside>
        <PlayerBar />
        <MiniPlayer onOpen={() => setSheetOpen(true)} />
        <TabBar route={route} onQueue={() => setQueueOpen(true)} />
      </div>

      {queueOpen && (
        <>
          <div className="scrim" onClick={() => setQueueOpen(false)} aria-hidden="true" />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Antrean">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--s-2)' }}>
              <button
                type="button"
                className="icon-button"
                onClick={() => setQueueOpen(false)}
                aria-label="Tutup antrean"
              >
                <CloseIcon />
              </button>
            </div>
            <QueueContent onNavigate={() => setQueueOpen(false)} />
          </div>
        </>
      )}

      <NowPlayingSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastRegion />

      <p className="sr-only" aria-live="polite">
        {nowPlaying ? `Sedang diputar: ${nowPlaying.title}` : ''}
      </p>
    </>
  )
}
