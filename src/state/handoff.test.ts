import { describe, expect, it } from 'vitest'
import { idleHandoff, beginHandoff, handoffIsBlocking, resolveHandoff, startPlayback } from './handoff'

describe('handoff state machine', () => {
  it('same-provider playback goes straight to playing with no message', () => {
    const state = startPlayback('am', 'am', true)
    expect(state.phase).toBe('playing')
    expect(state.message).toBeNull()
  })

  it('cross-provider playback starts in loading with the Indonesian message', () => {
    const state = startPlayback('am', 'sp', false)
    expect(state.phase).toBe('loading')
    expect(state.message).toBe('Memuat dari Spotify…')
    expect(state.from).toBe('am')
    expect(state.to).toBe('sp')
  })

  it('loading blocks interaction until it resolves', () => {
    expect(handoffIsBlocking(beginHandoff('am', 'sp'))).toBe(true)
    expect(handoffIsBlocking(startPlayback('am', 'am', true))).toBe(false)
  })

  it('success resolves to playing and clears the message', () => {
    const state = resolveHandoff(beginHandoff('am', 'sp'), 'success')
    expect(state.phase).toBe('playing')
    expect(state.message).toBeNull()
  })

  it('timeout resolves to failed with the reason users see', () => {
    const state = resolveHandoff(beginHandoff('am', 'sp'), 'timeout')
    expect(state.phase).toBe('failed')
    expect(state.message).toBe('Spotify tidak merespons. Dilewati.')
  })

  it('resolving from idle is a no-op', () => {
    expect(resolveHandoff(idleHandoff, 'success')).toBe(idleHandoff)
  })

  it('a failed handoff can be started again from the failed phase', () => {
    const failed = resolveHandoff(beginHandoff('am', 'td'), 'timeout')
    const again = beginHandoff('td', 'sp')
    expect(again.phase).toBe('loading')
    expect(failed.message).toBe('TIDAL tidak merespons. Dilewati.')
  })
})
