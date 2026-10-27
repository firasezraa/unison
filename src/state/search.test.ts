import { describe, expect, it } from 'vitest'
import { searchCatalog } from '../data/catalog'
import { emptySearch, flattenResults, providerDelay, searchReducer } from './search'

const AM_HITS = searchCatalog('am', 'hujan')

describe('searchReducer', () => {
  it('a new query resets results to pending rows in the requested order', () => {
    const state = searchReducer(emptySearch, { type: 'query', query: 'hujan', providers: ['am', 'sp'] })
    expect(state.results.map((row) => row.provider)).toEqual(['am', 'sp'])
    expect(state.results.every((row) => row.status === 'pending')).toBe(true)
  })

  it('late results append without disturbing existing row order', () => {
    let state = searchReducer(emptySearch, { type: 'query', query: 'hujan', providers: ['am', 'sp'] })
    const before = state.results.map((row) => row.provider)
    state = searchReducer(state, { type: 'results', provider: 'sp', tracks: [] })
    state = searchReducer(state, { type: 'results', provider: 'am', tracks: AM_HITS })
    expect(state.results.map((row) => row.provider)).toEqual(before)
  })

  it('a failing provider is marked error and keeps other rows intact', () => {
    let state = searchReducer(emptySearch, { type: 'query', query: 'hujan', providers: ['am', 'td'] })
    state = searchReducer(state, { type: 'results', provider: 'am', tracks: AM_HITS })
    state = searchReducer(state, { type: 'error', provider: 'td' })
    const byProvider = Object.fromEntries(state.results.map((row) => [row.provider, row.status]))
    expect(byProvider.am).toBe('ok')
    expect(byProvider.td).toBe('error')
  })

  it('retry returns only that provider to pending without clearing the query', () => {
    let state = searchReducer(emptySearch, { type: 'query', query: 'hujan', providers: ['am', 'td'] })
    state = searchReducer(state, { type: 'error', provider: 'td' })
    state = searchReducer(state, { type: 'retry', provider: 'td' })
    expect(state.query).toBe('hujan')
    expect(state.results.find((row) => row.provider === 'td')?.status).toBe('pending')
  })

  it('events for providers not in the current query are ignored', () => {
    const state = searchReducer(emptySearch, { type: 'query', query: 'hujan', providers: ['am'] })
    expect(searchReducer(state, { type: 'error', provider: 'sp' })).toBe(state)
  })

  it('flattenResults joins ok rows in order and skips pending and error rows', () => {
    let state = searchReducer(emptySearch, { type: 'query', query: 'hujan', providers: ['am', 'sp'] })
    state = searchReducer(state, { type: 'error', provider: 'sp' })
    state = searchReducer(state, { type: 'results', provider: 'am', tracks: AM_HITS })
    expect(flattenResults(state)).toHaveLength(AM_HITS.length)
  })

  it('trims the stored query and orders the fast service before the slow one', () => {
    const state = searchReducer(emptySearch, { type: 'query', query: '  hujan  ', providers: ['am', 'td'] })
    expect(state.query).toBe('hujan')
    expect(providerDelay('am')).toBeLessThan(providerDelay('td'))
  })
})
