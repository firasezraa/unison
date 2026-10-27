export interface PlaybackState {
  positionMs: number
  isPlaying: boolean
}

/** Lagu disimulasikan berjalan 12x lebih cepat supaya antrean bisa didemokan. */
export const PLAYBACK_RATE = 12

export function advancePlayback(state: PlaybackState, deltaMs: number, durationMs: number): PlaybackState {
  if (!state.isPlaying) return state
  const next = Math.min(state.positionMs + deltaMs, durationMs)
  return { positionMs: next, isPlaying: next < durationMs }
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function spokenTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes} menit ${seconds} detik`
}
