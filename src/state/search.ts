import type { ProviderId, Track } from '../domain/types'
import { searchCatalog } from '../data/catalog'

export type ProviderResultStatus = 'pending' | 'ok' | 'error'

export interface ProviderResult {
  provider: ProviderId
  status: ProviderResultStatus
  tracks: Track[]
}

export interface SearchState {
  query: string
  results: ProviderResult[]
}

export type SearchEvent =
  | { type: 'query'; query: string; providers: ProviderId[] }
  | { type: 'results'; provider: ProviderId; tracks: Track[] }
  | { type: 'error'; provider: ProviderId }
  | { type: 'retry'; provider: ProviderId }

export const emptySearch: SearchState = { query: '', results: [] }

export function searchReducer(state: SearchState, event: SearchEvent): SearchState {
  switch (event.type) {
    case 'query':
      return {
        query: event.query.trim(),
        results: event.providers.map((provider) => ({ provider, status: 'pending', tracks: [] })),
      }
    case 'results':
      return updateRow(state, event.provider, (row) => ({ ...row, status: 'ok', tracks: event.tracks }))
    case 'error':
      return updateRow(state, event.provider, (row) => ({ ...row, status: 'error', tracks: [] }))
    case 'retry':
      return updateRow(state, event.provider, (row) => ({ ...row, status: 'pending', tracks: [] }))
    default:
      return state
  }
}

function updateRow(
  state: SearchState,
  provider: ProviderId,
  change: (row: ProviderResult) => ProviderResult,
): SearchState {
  if (!state.results.some((row) => row.provider === provider)) return state
  return {
    ...state,
    results: state.results.map((row) => (row.provider === provider ? change(row) : row)),
  }
}

export function flattenResults(state: SearchState): Track[] {
  return state.results.filter((row) => row.status === 'ok').flatMap((row) => row.tracks)
}

const DELAYS: Record<ProviderId, number> = { am: 250, sp: 900, td: 1800, yt: 600, sc: 1200 }

/** Latensi tiruan per layanan, supaya hasil lambat benar-benar menyusul di bawah. */
export function providerDelay(provider: ProviderId): number {
  return DELAYS[provider]
}

export function runProviderQuery(provider: ProviderId, query: string): Track[] {
  return searchCatalog(provider, query)
}
