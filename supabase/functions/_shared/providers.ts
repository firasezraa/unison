// Shared: registry provider OAuth + kemampuan (capabilities) jujur.
// Endpoint Apple Music & TIDAL membutuhkan spike verifikasi (lihat IDEA.md §6).

export type ProviderId = 'spotify' | 'apple' | 'tidal' | 'youtube' | 'soundcloud'

export const PROVIDER_IDS: ProviderId[] = ['spotify', 'apple', 'tidal', 'youtube', 'soundcloud']

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (PROVIDER_IDS as string[]).includes(value)
}

export interface ProviderSpec {
  id: ProviderId
  /** URL mulai otorisasi (authorization endpoint). */
  authorizeUrl: string
  /** URL tukar code menjadi token. */
  tokenUrl: string
  scopes: string[]
  capabilities: {
    playback: boolean
    libraryRead: boolean
    playlistWrite: boolean
  }
  /** Nama variabel env untuk Client ID (kosong = belum dikonfigurasi). */
  clientIdEnv: string
}

export const PROVIDER_SPECS: Record<ProviderId, ProviderSpec> = {
  spotify: {
    id: 'spotify',
    authorizeUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: ['user-read-private', 'user-read-email', 'user-library-read'],
    capabilities: { playback: true, libraryRead: true, playlistWrite: true },
    clientIdEnv: 'SPOTIFY_CLIENT_ID',
  },
  apple: {
    id: 'apple',
    // Sign in with Apple (user token) + MusicKit (developer token untuk playback).
    // Developer token diterbitkan endpoint terpisah (apple-developer-token).
    authorizeUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scopes: [],
    capabilities: { playback: true, libraryRead: true, playlistWrite: false },
    clientIdEnv: 'APPLE_MUSIC_CLIENT_ID',
  },
  tidal: {
    id: 'tidal',
    // Endpoint perlu verifikasi saat spike (PRD §9 menandai TIDAL "perlu verifikasi").
    authorizeUrl: '',
    tokenUrl: '',
    scopes: [],
    capabilities: { playback: false, libraryRead: false, playlistWrite: false },
    clientIdEnv: 'TIDAL_CLIENT_ID',
  },
  youtube: {
    id: 'youtube',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    capabilities: { playback: false, libraryRead: false, playlistWrite: false },
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
  },
  soundcloud: {
    id: 'soundcloud',
    authorizeUrl: 'https://secure.soundcloud.com/authorize',
    tokenUrl: 'https://secure.soundcloud.com/oauth/token',
    scopes: [],
    capabilities: { playback: true, libraryRead: false, playlistWrite: false },
    clientIdEnv: 'SOUNDCLOUD_CLIENT_ID',
  },
}

export function providerSpec(id: ProviderId): ProviderSpec {
  return PROVIDER_SPECS[id]
}

/** Nama variabel env untuk Client Secret (mis. SPOTIFY_CLIENT_ID -> SPOTIFY_CLIENT_SECRET). */
export function clientSecretEnv(id: ProviderId): string {
  return PROVIDER_SPECS[id].clientIdEnv.replace('CLIENT_ID', 'CLIENT_SECRET')
}

/** True bila Client ID terisi di environment; provider tanpa kredensial = belum dikonfigurasi. */
export function isConfigured(id: ProviderId, env: (name: string) => string | undefined): boolean {
  const name = PROVIDER_SPECS[id].clientIdEnv
  const value = env(name)
  return typeof value === 'string' && value.trim().length > 0
}
