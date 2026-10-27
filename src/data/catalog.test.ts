import { describe, expect, it } from 'vitest'
import { CATALOG, EMPTY_ARTWORK_TRACK_ID, PLAYLISTS, searchCatalog, trackById } from './catalog'
import { PROVIDER_LIST } from './providers'

describe('catalog', () => {
  it('covers at least four services and includes an unavailable track', () => {
    const providers = new Set(CATALOG.map((track) => track.provider))
    expect(providers.size).toBeGreaterThanOrEqual(4)
    expect(CATALOG.some((track) => !track.available)).toBe(true)
  })

  it('searches case-insensitively on title and artist inside one service', () => {
    const hits = searchCatalog('am', 'HUJAN')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((track) => track.provider === 'am')).toBe(true)
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchCatalog('sp', 'zzzzzz')).toEqual([])
  })

  it('returns nothing for an empty query', () => {
    expect(searchCatalog('sp', '   ')).toEqual([])
  })

  it('has a disconnected YouTube and a SoundCloud that needs reconnecting', () => {
    const statuses = Object.fromEntries(PROVIDER_LIST.map((p) => [p.id, p.status]))
    expect(statuses.am).toBe('connected')
    expect(statuses.sp).toBe('connected')
    expect(statuses.sc).toBe('needs-reconnect')
    expect(statuses.yt).toBe('disconnected')
  })

  it('every playlist references existing tracks', () => {
    for (const playlist of PLAYLISTS) {
      for (const id of playlist.trackIds) expect(trackById(id)).toBeDefined()
    }
  })

  it('keeps at least one track without artwork so the fallback is exercised', () => {
    expect(trackById(EMPTY_ARTWORK_TRACK_ID)?.artwork).toBeNull()
  })

  it('keeps durations plausible for display', () => {
    for (const track of CATALOG) {
      expect(track.durationMs).toBeGreaterThan(120000)
      expect(track.durationMs).toBeLessThan(400000)
    }
  })
})
