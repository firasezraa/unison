import { describe, expect, it } from 'vitest'
import { advancePlayback, formatTime, spokenTime } from './playback'

describe('advancePlayback', () => {
  it('advances position while playing', () => {
    expect(advancePlayback({ positionMs: 0, isPlaying: true }, 500, 30000).positionMs).toBe(500)
  })

  it('clamps at duration and stops', () => {
    const state = advancePlayback({ positionMs: 29500, isPlaying: true }, 1000, 30000)
    expect(state.positionMs).toBe(30000)
    expect(state.isPlaying).toBe(false)
  })

  it('does not advance while paused', () => {
    const state = advancePlayback({ positionMs: 1000, isPlaying: false }, 500, 30000)
    expect(state).toEqual({ positionMs: 1000, isPlaying: false })
  })
})

describe('time formatting', () => {
  it('formats minutes and seconds with a padded seconds field', () => {
    expect(formatTime(134000)).toBe('2:14')
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(60000)).toBe('1:00')
  })

  it('never shows a negative time', () => {
    expect(formatTime(-5000)).toBe('0:00')
  })

  it('speaks time for screen readers', () => {
    expect(spokenTime(134000)).toBe('2 menit 14 detik')
  })
})
