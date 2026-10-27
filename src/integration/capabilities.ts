// Matriks kemampuan per provider (cermin dari supabase/functions/_shared/providers.ts).
// Sumber kebenaran untuk layar Koneksi: UI tidak boleh menampilkan kemampuan yang tidak ada.

import type { Capabilities, ProviderAccountStatus, ProviderId } from './types'

export const CAPABILITIES: Record<ProviderId, Capabilities> = {
  spotify: { playback: true, libraryRead: true, playlistWrite: true },
  apple: { playback: true, libraryRead: true, playlistWrite: false },
  tidal: { playback: false, libraryRead: false, playlistWrite: false },
  youtube: { playback: false, libraryRead: false, playlistWrite: false },
  soundcloud: { playback: true, libraryRead: false, playlistWrite: false },
}

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  tidal: 'TIDAL',
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
}

export const PROVIDER_CODES: Record<ProviderId, string> = {
  spotify: 'SP',
  apple: 'AM',
  tidal: 'TD',
  youtube: 'YT',
  soundcloud: 'SC',
}

export const STATUS_LABELS: Record<ProviderAccountStatus, string> = {
  active: 'Terhubung',
  'needs-reconnect': 'Perlu sambung ulang',
  disconnected: 'Belum terhubung',
}

/** Syarat akun per provider, ditulis sebagai kalimat biasa (DESIGN.md §6.4). */
export const PROVIDER_REQUIREMENTS: Record<ProviderId, string> = {
  spotify: 'Butuh Spotify Premium. Putar di desktop.',
  apple: 'Butuh langganan Apple Music dan developer token MusicKit.',
  tidal: 'Butuh langganan TIDAL. Endpoint masih perlu verifikasi.',
  youtube: 'Tanpa langganan. Playback berupa video sesuai ToS.',
  soundcloud: 'Tanpa langganan. Perlu registrasi app.',
}

export function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === 'string' &&
    ['spotify', 'apple', 'tidal', 'youtube', 'soundcloud'].includes(value)
  )
}
