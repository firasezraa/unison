import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ProviderId } from '../domain/types'
import { PROVIDERS } from '../data/providers'
import { emptySearch, providerDelay, runProviderQuery, searchReducer } from '../state/search'
import { TrackRow } from '../components/TrackRow'
import { ProviderBadge } from '../components/ProviderBadge'
import { SearchIcon, WarningIcon } from '../icons'
import { useUnison } from '../app/UnisonContext'

/** Kata kunci yang diawali "x" memicu kegagalan TIDAL; huruf "x" itu diabaikan saat mencari. */
function shouldFail(provider: ProviderId, query: string): boolean {
  return provider === 'td' && /^x/i.test(query.trim())
}

function cleanQuery(query: string): string {
  return /^x/i.test(query.trim()) ? query.trim().slice(1).trim() : query
}

export function SearchView() {
  const { providers, providerStatus, playTrack, queueTrack, playNextTrack, priority, nowPlaying } = useUnison()
  const [state, dispatch] = useReducer(searchReducer, emptySearch)
  const [input, setInput] = useState('')
  const timers = useRef<number[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const connected = useMemo(() => {
    const ordered = priority.filter((id) => providers.some((provider) => provider.id === id))
    return ordered.filter((id) => providerStatus(id) !== 'disconnected')
  }, [priority, providers, providerStatus])

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }

  const run = (query: string, ids: ProviderId[]) => {
    clearTimers()
    dispatch({ type: 'query', query, providers: ids })
    if (!query.trim()) return
    const term = cleanQuery(query)
    ids.forEach((provider) => {
      const timer = window.setTimeout(() => {
        if (shouldFail(provider, query)) {
          dispatch({ type: 'error', provider })
          return
        }
        dispatch({ type: 'results', provider, tracks: runProviderQuery(provider, term) })
      }, providerDelay(provider))
      timers.current.push(timer)
    })
  }

  useEffect(() => clearTimers, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true
      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onChange = (value: string) => {
    setInput(value)
    run(value, connected)
  }

  const retry = (provider: ProviderId) => {
    dispatch({ type: 'retry', provider })
    const query = state.query
    const term = cleanQuery(query)
    const timer = window.setTimeout(() => {
      if (shouldFail(provider, query)) {
        dispatch({ type: 'error', provider })
        return
      }
      dispatch({ type: 'results', provider, tracks: runProviderQuery(provider, term) })
    }, providerDelay(provider))
    timers.current.push(timer)
  }

  const okRows = state.results.filter((row) => row.status === 'ok' && row.tracks.length > 0)
  const pendingRows = state.results.filter((row) => row.status === 'pending')
  const errorRows = state.results.filter((row) => row.status === 'error')
  const anyResult = okRows.length > 0

  return (
    <div className="view">
      <header className="view__header">
        <h1 className="view__title">Cari</h1>
        <p className="view__lede">
          Satu pencarian untuk semua layanan yang terhubung. Hasil muncul dari layanan tercepat lebih dulu.
        </p>
      </header>

      <div className="search-field">
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          value={input}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Cari lagu, album, artis…"
          aria-label="Cari lagu, album, artis"
          autoComplete="off"
        />
        {!input && <span className="search-kbd">/</span>}
      </div>

      {state.query && !anyResult && pendingRows.length === 0 && errorRows.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__title">Tidak ada hasil untuk “{state.query}”.</p>
          <p className="empty-state__text">Coba kata kunci lain atau hubungkan layanan tambahan.</p>
        </div>
      )}

      {okRows.map((row) => (
        <section className="result-group" key={row.provider} aria-labelledby={`group-${row.provider}`}>
          <div className="result-group__head">
            <ProviderBadge provider={row.provider} />
            <h2 className="result-group__title" id={`group-${row.provider}`}>
              {PROVIDERS[row.provider].name}
            </h2>
            <span className="result-group__title">{row.tracks.length} lagu</span>
          </div>
          <ul className="row-list">
            {row.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                isCurrent={nowPlaying?.id === track.id}
                providerStatus={providerStatus(track.provider)}
                onPlay={() => playTrack(track, row.tracks)}
                onQueue={() => queueTrack(track)}
                onPlayNext={() => playNextTrack(track)}
                showProviderCode={false}
              />
            ))}
          </ul>
        </section>
      ))}

      {state.query && (pendingRows.length > 0 || errorRows.length > 0) && (
        <div style={{ marginTop: 'var(--s-6)' }}>
          {pendingRows.map((row) => (
            <p className="result-status" key={row.provider}>
              <ProviderBadge provider={row.provider} />
              <span className="pulse-dot" aria-hidden="true" />
              <span style={{ flex: 1 }}>Mencari di {PROVIDERS[row.provider].name}…</span>
            </p>
          ))}
          {errorRows.map((row) => (
            <p className="result-status result-status--error" key={row.provider}>
              <ProviderBadge provider={row.provider} />
              <WarningIcon />
              <span style={{ flex: 1 }}>Hasil dari {PROVIDERS[row.provider].name} belum tersedia.</span>
              <button type="button" className="btn btn--text" onClick={() => retry(row.provider)}>
                Coba lagi
              </button>
            </p>
          ))}
        </div>
      )}

      {!state.query && (
        <div className="empty-state">
          <p className="empty-state__title">Mulai dengan satu kata kunci.</p>
          <p className="empty-state__text">
            Coba “hujan” untuk melihat hasil dari beberapa layanan sekaligus, atau “xhujan” untuk melihat apa yang
            terjadi ketika satu layanan gagal menjawab.
          </p>
        </div>
      )}
    </div>
  )
}
