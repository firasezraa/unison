export type ProviderId = 'sp' | 'am' | 'td' | 'yt' | 'sc'

export type ProviderStatus = 'connected' | 'needs-reconnect' | 'disconnected'

export interface Capabilities {
  playback: boolean
  libraryRead: boolean
  playlistWrite: boolean
}

export interface Provider {
  id: ProviderId
  code: string
  name: string
  status: ProviderStatus
  capabilities: Capabilities
  /** Syarat akun, ditulis sebagai kalimat biasa. */
  requirement: string
  /** Kemampuan yang tersedia, ditulis sebagai kalimat biasa. */
  summary: string
}

export interface Track {
  id: string
  provider: ProviderId
  title: string
  artist: string
  album: string
  durationMs: number
  artwork: string | null
  available: boolean
}

export interface Playlist {
  id: string
  name: string
  description: string
  trackIds: string[]
}

export interface Toast {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}
