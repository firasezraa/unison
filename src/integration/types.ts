// Lapisan integrasi Unison — kontrak adapter provider.
// Slug provider memakai nama penuh (sama dengan backend & kolom DB), BUKAN kode pendek
// ('am', 'sp', ...) yang dipakai mock prototipe di src/data.

export type ProviderId = 'spotify' | 'apple' | 'tidal' | 'youtube' | 'soundcloud'

export type ProviderAccountStatus = 'active' | 'needs-reconnect' | 'disconnected'

export interface Capabilities {
  playback: boolean
  libraryRead: boolean
  playlistWrite: boolean
}

/** Status koneksi satu provider untuk pengguna, tanpa token apa pun. */
export interface ProviderAccount {
  provider: ProviderId
  status: ProviderAccountStatus
  connectedAt: string | null
  /** True bila Client ID provider sudah diisi di secret Edge Function. */
  configured: boolean
}

/** Kontrak adapter (lihat IDEA.md §7.2). Belum diimplementasikan penuh di fase arsitektur. */
export interface MusicProvider {
  id: ProviderId
  capabilities: Capabilities
  connect(): Promise<void>
  disconnect(): Promise<void>
  search(query: string): Promise<ProviderTrack[]>
}

export interface ProviderTrack {
  provider: ProviderId
  providerTrackId: string
  title: string
  artist: string
  album?: string
  durationMs?: number
}
