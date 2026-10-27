import { describe, expect, it } from 'vitest'
import {
  CAPABILITIES,
  isProviderId,
  PROVIDER_CODES,
  PROVIDER_NAMES,
  PROVIDER_REQUIREMENTS,
  STATUS_LABELS,
} from './capabilities'

describe('capability matrix', () => {
  it('setiap provider punya nama, kode, syarat, dan kemampuan', () => {
    const ids = Object.keys(CAPABILITIES)
    expect(ids).toHaveLength(5)
    for (const id of ids) {
      expect(PROVIDER_NAMES[id as keyof typeof PROVIDER_NAMES]).toBeTruthy()
      expect(PROVIDER_CODES[id as keyof typeof PROVIDER_CODES]).toMatch(/^[A-Z]{2}$/)
      expect(PROVIDER_REQUIREMENTS[id as keyof typeof PROVIDER_REQUIREMENTS]).toBeTruthy()
    }
  })

  it('TIDAL dan YouTube belum mendukung playback (jujur)', () => {
    expect(CAPABILITIES.tidal.playback).toBe(false)
    expect(CAPABILITIES.youtube.playback).toBe(false)
    expect(CAPABILITIES.spotify.playback).toBe(true)
    expect(CAPABILITIES.apple.playback).toBe(true)
  })

  it('memvalidasi whitelist provider', () => {
    expect(isProviderId('spotify')).toBe(true)
    expect(isProviderId('deezer')).toBe(false)
    expect(isProviderId(42)).toBe(false)
  })

  it('label status memuat istilah tetap DESIGN.md', () => {
    expect(STATUS_LABELS.active).toBe('Terhubung')
    expect(STATUS_LABELS['needs-reconnect']).toBe('Perlu sambung ulang')
    expect(STATUS_LABELS.disconnected).toBe('Belum terhubung')
  })
})
