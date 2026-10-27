import type { Provider, ProviderId } from '../domain/types'

export const PROVIDERS: Record<ProviderId, Provider> = {
  am: {
    id: 'am',
    code: 'AM',
    name: 'Apple Music',
    status: 'connected',
    capabilities: { playback: true, libraryRead: true, playlistWrite: false },
    requirement: 'Butuh langganan Apple Music aktif.',
    summary: 'Bisa diputar dan library bisa dibaca.',
  },
  sp: {
    id: 'sp',
    code: 'SP',
    name: 'Spotify',
    status: 'connected',
    capabilities: { playback: true, libraryRead: true, playlistWrite: true },
    requirement: 'Butuh Spotify Premium. Putar di desktop.',
    summary: 'Bisa diputar, library dibaca, playlist ditulis.',
  },
  td: {
    id: 'td',
    code: 'TD',
    name: 'TIDAL',
    status: 'connected',
    capabilities: { playback: true, libraryRead: false, playlistWrite: false },
    requirement: 'Butuh langganan TIDAL. Pencarian kadang lambat.',
    summary: 'Bisa diputar. Library belum bisa dibaca.',
  },
  yt: {
    id: 'yt',
    code: 'YT',
    name: 'YouTube',
    status: 'disconnected',
    capabilities: { playback: true, libraryRead: false, playlistWrite: false },
    requirement: 'Tanpa langganan, dengan iklan.',
    summary: 'Bisa diputar. Library terbatas.',
  },
  sc: {
    id: 'sc',
    code: 'SC',
    name: 'SoundCloud',
    status: 'needs-reconnect',
    capabilities: { playback: true, libraryRead: false, playlistWrite: false },
    requirement: 'Izin aplikasi kedaluwarsa. Sambungkan ulang untuk memutar.',
    summary: 'Bisa diputar setelah disambungkan ulang.',
  },
}

export const PROVIDER_LIST: Provider[] = [PROVIDERS.am, PROVIDERS.sp, PROVIDERS.td, PROVIDERS.yt, PROVIDERS.sc]

export function providerName(id: ProviderId): string {
  return PROVIDERS[id].name
}
