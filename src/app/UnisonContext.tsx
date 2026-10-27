import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Playlist, Provider, ProviderId, ProviderStatus, Toast, Track } from '../domain/types'
import { PROVIDERS, PROVIDER_LIST } from '../data/providers'
import { PLAYLISTS, trackById } from '../data/catalog'
import {
  currentTrack,
  initialQueue,
  queueReducer,
  type QueueAction,
  type QueueState,
} from '../state/queue'
import {
  HANDOFF_TIMEOUT_MS,
  beginHandoff,
  handoffIsBlocking,
  idleHandoff,
  resolveHandoff,
  type HandoffState,
} from '../state/handoff'
import { PLAYBACK_RATE, advancePlayback, type PlaybackState } from '../state/playback'

export type Theme = 'light' | 'dark' | 'system'

export interface UnisonValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  providers: Provider[]
  providerStatus: (id: ProviderId) => ProviderStatus
  setProviderStatus: (id: ProviderId, status: ProviderStatus) => void
  queue: QueueState
  dispatchQueue: (action: QueueAction) => void
  nowPlaying: Track | null
  playback: PlaybackState
  handoff: HandoffState
  volume: number
  setVolume: (value: number) => void
  playTrack: (track: Track, list?: Track[]) => void
  playAt: (index: number) => void
  removeAt: (index: number) => void
  toggle: () => void
  seek: (positionMs: number) => void
  next: () => void
  previous: () => void
  queueTrack: (track: Track) => void
  playNextTrack: (track: Track) => void
  demoFailHandoff: boolean
  setDemoFailHandoff: (value: boolean) => void
  skippedIds: string[]
  lastPlayed: Track[]
  playlists: Playlist[]
  findTrack: (id: string) => Track | undefined
  toasts: Toast[]
  notify: (message: string, action?: { label: string; run: () => void }) => void
  dismissToast: (id: number) => void
  priority: ProviderId[]
  setPriority: (ids: ProviderId[]) => void
}

const UnisonContext = createContext<UnisonValue | null>(null)

const PRIORITY_KEY = 'unison.priority'
const THEME_KEY = 'unison.theme'
const DEMO_KEY = 'unison.demoFail'

function readPriority(fallback: ProviderId[]): ProviderId[] {
  try {
    const raw = window.localStorage.getItem(PRIORITY_KEY)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return fallback
    const valid = parsed.filter((id): id is ProviderId => typeof id === 'string' && id in PROVIDERS)
    const missing = fallback.filter((id) => !valid.includes(id))
    return [...valid, ...missing]
  } catch {
    return fallback
  }
}

function readTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* localStorage bisa diblokir */
  }
  return 'system'
}

export function UnisonProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const [statuses, setStatuses] = useState<Record<ProviderId, ProviderStatus>>(() => ({
    am: PROVIDERS.am.status,
    sp: PROVIDERS.sp.status,
    td: PROVIDERS.td.status,
    yt: PROVIDERS.yt.status,
    sc: PROVIDERS.sc.status,
  }))
  const [queue, setQueue] = useState<QueueState>(initialQueue)
  const [playback, setPlayback] = useState<PlaybackState>({ positionMs: 0, isPlaying: false })
  const [handoff, setHandoff] = useState<HandoffState>(idleHandoff)
  const [volume, setVolume] = useState(0.7)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [demoFailHandoff, setDemoFailHandoffState] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(DEMO_KEY) === '1'
    } catch {
      return false
    }
  })
  const [lastPlayed, setLastPlayed] = useState<Track[]>([])
  const [skippedIds, setSkippedIds] = useState<string[]>([])
  const [priority, setPriorityState] = useState<ProviderId[]>(() =>
    readPriority(PROVIDER_LIST.map((provider) => provider.id)),
  )

  const toastSeq = useRef(1)
  const toastTimers = useRef<number[]>([])
  const handoffTimer = useRef<number | null>(null)

  /* state terbaru untuk loop interval */
  const latest = useRef({ queue, playback, handoff, demoFailHandoff, statuses })
  useEffect(() => {
    latest.current = { queue, playback, handoff, demoFailHandoff, statuses }
  }, [queue, playback, handoff, demoFailHandoff, statuses])

  const providers = useMemo(
    () => PROVIDER_LIST.map((provider) => ({ ...provider, status: statuses[provider.id] })),
    [statuses],
  )

  const providerStatus = useCallback((id: ProviderId) => statuses[id], [statuses])

  const setProviderStatus = useCallback((id: ProviderId, status: ProviderStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: status }))
  }, [])

  const findTrack = useCallback((id: string) => trackById(id), [])

  /* ---------- tema ---------- */

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      if (theme === 'system') delete root.dataset.theme
      else root.dataset.theme = theme
    }
    apply()
    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    return undefined
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(THEME_KEY, next)
    } catch {
      /* diabaikan */
    }
  }, [])

  const setDemoFailHandoff = useCallback((value: boolean) => {
    setDemoFailHandoffState(value)
    try {
      window.localStorage.setItem(DEMO_KEY, value ? '1' : '0')
    } catch {
      /* diabaikan */
    }
  }, [])

  const setPriority = useCallback((ids: ProviderId[]) => {
    setPriorityState(ids)
    try {
      window.localStorage.setItem(PRIORITY_KEY, JSON.stringify(ids))
    } catch {
      /* diabaikan */
    }
  }, [])

  /* ---------- toast ---------- */

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback((message: string, action?: { label: string; run: () => void }) => {
    const id = toastSeq.current++
    setToasts((prev) => [
      ...prev.slice(-2),
      { id, message, actionLabel: action?.label, onAction: action?.run },
    ])
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 4000)
    toastTimers.current.push(timer)
  }, [])

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => window.clearTimeout(timer))
      if (handoffTimer.current) window.clearTimeout(handoffTimer.current)
    },
    [],
  )

  const dispatchQueue = useCallback((action: QueueAction) => {
    setQueue((prev) => queueReducer(prev, action))
  }, [])

  /* ---------- aturan kelayakan ---------- */

  const check = useCallback((track: Track | null): { ok: boolean; reason?: string } => {
    if (!track) return { ok: false }
    const name = PROVIDERS[track.provider].name
    if (!track.available) {
      return { ok: false, reason: `“${track.title}” tidak tersedia di ${name}. Dilewati.` }
    }
    const status = latest.current.statuses[track.provider]
    if (status === 'needs-reconnect') {
      return {
        ok: false,
        reason: `Sambungan ke ${name} berakhir. Sambungkan ulang untuk memutar lagu dari ${name}.`,
        actionLabel: 'Sambungkan ulang',
      } as { ok: boolean; reason?: string }
    }
    if (status === 'disconnected') {
      return { ok: false, reason: `${name} belum terhubung. Dilewati.` }
    }
    return { ok: true }
  }, [])

  const beginTrack = useCallback((track: Track, _from: ProviderId | null) => {
    /* aksi pengguna selalu langsung memutar; status "memuat" hanya untuk handoff otomatis */
    if (handoffTimer.current) {
      window.clearTimeout(handoffTimer.current)
      handoffTimer.current = null
    }
    setHandoff({ phase: 'playing', from: track.provider, to: track.provider, message: null })
    setPlayback({ positionMs: 0, isPlaying: true })
    setLastPlayed((prev) => [track, ...prev.filter((item) => item.id !== track.id)].slice(0, 8))
  }, [])

  const playAt = useCallback(
    (index: number) => {
      const track = latest.current.queue.items[index]
      if (!track) return
      const verdict = check(track)
      if (!verdict.ok) {
        notify(verdict.reason ?? 'Lagu tidak bisa diputar.', {
          label: 'Sambungkan ulang',
          run: () => {
            window.location.hash = '#/koneksi'
          },
        })
        return
      }
      setQueue((prev) => ({ ...prev, currentIndex: index }))
      beginTrack(track, null)
    },
    [beginTrack, check, notify],
  )

  /** Hapus item antrean; kalau yang dihapus sedang diputar, lanjut ke item berikutnya. */
  const removeAt = useCallback(
    (index: number) => {
      const state = latest.current.queue
      const removingCurrent = index === state.currentIndex
      const nextState = queueReducer(state, { type: 'remove', index })
      setQueue(nextState)

      if (!removingCurrent) return

      const nextUp = nextState.items[nextState.currentIndex]
      if (!nextUp) {
        setPlayback({ positionMs: 0, isPlaying: false })
        setHandoff(idleHandoff)
        return
      }
      const verdict = check(nextUp)
      if (!verdict.ok) {
        setPlayback({ positionMs: 0, isPlaying: false })
        setHandoff(idleHandoff)
        notify(verdict.reason ?? 'Lagu tidak bisa diputar.')
        return
      }
      beginTrack(nextUp, null)
    },
    [beginTrack, check, notify],
  )

  const playTrack = useCallback(
    (track: Track, list?: Track[]) => {
      const verdict = check(track)
      if (!verdict.ok) {
        notify(verdict.reason ?? 'Lagu tidak bisa diputar.', {
          label: 'Sambungkan ulang',
          run: () => {
            window.location.hash = '#/koneksi'
          },
        })
        return
      }
      if (list && list.length > 0) {
        const index = Math.max(
          0,
          list.findIndex((item) => item.id === track.id),
        )
        setQueue(queueReducer(initialQueue, { type: 'replace', items: list, startIndex: index }))
      } else {
        setQueue((prev) => {
          const existing = prev.items.findIndex((item) => item.id === track.id)
          if (existing >= 0) return { ...prev, currentIndex: existing }
          const items = [...prev.items, track]
          return { items, currentIndex: items.length - 1 }
        })
      }
      beginTrack(track, null)
    },
    [beginTrack, check, notify],
  )

  const queueTrack = useCallback(
    (track: Track) => {
      dispatchQueue({ type: 'add', track })
      notify(`“${track.title}” ditambahkan ke antrean.`)
    },
    [dispatchQueue, notify],
  )

  const playNextTrack = useCallback(
    (track: Track) => {
      dispatchQueue({ type: 'playNext', track })
      notify(`“${track.title}” diputar berikutnya.`)
    },
    [dispatchQueue, notify],
  )

  const toggle = useCallback(() => {
    const { handoff: current, queue: currentQueue } = latest.current
    if (handoffIsBlocking(current)) return
    if (currentQueue.currentIndex < 0) return
    setPlayback((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
  }, [])

  const seek = useCallback((positionMs: number) => {
    const track = currentTrack(latest.current.queue)
    if (!track) return
    const clamped = Math.max(0, Math.min(positionMs, track.durationMs))
    if (clamped >= track.durationMs) {
      /* berhenti 1 ms sebelum akhir supaya loop pemutaran yang memicu handoff, bukan seek */
      setPlayback((prev) => ({ ...prev, positionMs: Math.max(0, track.durationMs - 1), isPlaying: true }))
      return
    }
    setPlayback((prev) => ({ ...prev, positionMs: clamped }))
  }, [])

  /** Lanjut ke item berikutnya; item yang tak bisa diputar dilewati dengan penjelasan. */
  const advanceTo = useCallback(
    (fromProvider: ProviderId | null, message?: string, skipCount = 0) => {
      if (message) {
        notify(message, {
          label: 'Cari di layanan lain',
          run: () => {
            window.location.hash = '#/cari'
          },
        })
      }

      const state = latest.current.queue
      const failedIndex = state.currentIndex + 1
      const start = failedIndex + skipCount
      let target = start

      while (target < state.items.length) {
        const verdict = check(state.items[target])
        if (verdict.ok) break
        if (verdict.reason && target === start) notify(verdict.reason)
        target += 1
      }

      /* catat lagu yang dilewati supaya tetap terlihat di antrean, tidak hilang diam-diam */
      const passed = state.items.slice(failedIndex, target)
      if (passed.length > 0) {
        setSkippedIds((prev) => [...prev, ...passed.map((item) => item.id)].slice(-12))
      }

      if (target >= state.items.length) {
        setPlayback({ positionMs: 0, isPlaying: false })
        setHandoff(idleHandoff)
        return
      }

      setQueue({ items: state.items, currentIndex: target })
      beginTrack(state.items[target], fromProvider)
    },
    [beginTrack, check, notify],
  )

  const finishTrack = useCallback(() => {
    const state = latest.current.queue
    const track = state.items[state.currentIndex]
    if (!track) return
    const upcoming = state.items[state.currentIndex + 1]
    if (!upcoming) {
      setPlayback({ positionMs: track.durationMs, isPlaying: false })
      setHandoff(idleHandoff)
      return
    }
    const verdict = check(upcoming)
    if (!verdict.ok) {
      advanceTo(track.provider, verdict.reason)
      return
    }
    if (upcoming.provider === track.provider) {
      setQueue((prev) => ({ ...prev, currentIndex: Math.min(prev.currentIndex + 1, prev.items.length - 1) }))
      beginTrack(upcoming, track.provider)
      return
    }

    /* pindah layanan: tampilkan benang yang bergeser lalu putar atau lewati */
    const willFail = latest.current.demoFailHandoff
    setHandoff(beginHandoff(track.provider, upcoming.provider))
    setPlayback({ positionMs: 0, isPlaying: false })
    if (handoffTimer.current) window.clearTimeout(handoffTimer.current)
    handoffTimer.current = window.setTimeout(
      () => {
        if (willFail) {
          const failed = resolveHandoff(beginHandoff(track.provider, upcoming.provider), 'timeout')
          setHandoff(failed)
          /* dilewati: lompati lagu yang gagal dimuat, tapi lagunya tetap di antrean */
          advanceTo(upcoming.provider, failed.message ?? 'Layanan tidak merespons. Dilewati.', 1)
          return
        }
        setHandoff(resolveHandoff(beginHandoff(track.provider, upcoming.provider), 'success'))
        setQueue((prev) => ({ ...prev, currentIndex: Math.min(prev.currentIndex + 1, prev.items.length - 1) }))
        beginTrack(upcoming, track.provider)
      },
      willFail ? HANDOFF_TIMEOUT_MS : 900,
    )
  }, [advanceTo, beginTrack, check])

  const next = useCallback(() => {
    const state = latest.current.queue
    const track = state.items[state.currentIndex] ?? null
    if (!state.items[state.currentIndex + 1]) {
      setPlayback((prev) => ({ ...prev, isPlaying: false }))
      return
    }
    advanceTo(track?.provider ?? null)
  }, [advanceTo])

  const previous = useCallback(() => {
    const state = latest.current.queue
    if (latest.current.playback.positionMs > 3000) {
      setPlayback((prev) => ({ ...prev, positionMs: 0 }))
      return
    }
    const target = Math.max(0, state.currentIndex - 1)
    const track = state.items[target]
    if (!track) return
    const verdict = check(track)
    if (!verdict.ok) {
      notify(verdict.reason ?? 'Lagu tidak bisa diputar.')
      return
    }
    setQueue((prev) => ({ ...prev, currentIndex: target }))
    beginTrack(track, state.items[state.currentIndex]?.provider ?? null)
  }, [beginTrack, check, notify])

  /* ---------- loop pemutaran ---------- */

  useEffect(() => {
    const id = window.setInterval(() => {
      const { playback: current, handoff: currentHandoff, queue: currentQueue } = latest.current
      if (!current.isPlaying) return
      if (handoffIsBlocking(currentHandoff)) return
      const track = currentQueue.items[currentQueue.currentIndex]
      if (!track) return
      const advanced = advancePlayback(current, 250 * PLAYBACK_RATE, track.durationMs)
      if (advanced.positionMs >= track.durationMs) {
        finishTrack()
        return
      }
      setPlayback(advanced)
    }, 250)
    return () => window.clearInterval(id)
  }, [finishTrack])

  const value: UnisonValue = {
    theme,
    setTheme,
    providers,
    providerStatus,
    setProviderStatus,
    queue,
    dispatchQueue,
    nowPlaying: currentTrack(queue),
    playback,
    handoff,
    volume,
    setVolume,
    playTrack,
    playAt,
    removeAt,
    toggle,
    seek,
    next,
    previous,
    queueTrack,
    playNextTrack,
    demoFailHandoff,
    setDemoFailHandoff,
    skippedIds,
    lastPlayed,
    playlists: PLAYLISTS,
    findTrack,
    toasts,
    notify,
    dismissToast,
    priority,
    setPriority,
  }

  return <UnisonContext.Provider value={value}>{children}</UnisonContext.Provider>
}

export function useUnison(): UnisonValue {
  const value = useContext(UnisonContext)
  if (!value) throw new Error('useUnison harus dipakai di dalam UnisonProvider')
  return value
}