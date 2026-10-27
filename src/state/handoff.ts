import type { ProviderId } from '../domain/types'
import { providerName } from '../data/providers'

export type HandoffPhase = 'idle' | 'warmup' | 'loading' | 'playing' | 'failed'

export interface HandoffState {
  phase: HandoffPhase
  from: ProviderId | null
  to: ProviderId | null
  message: string | null
}

export const HANDOFF_TIMEOUT_MS = 8000

export const idleHandoff: HandoffState = { phase: 'idle', from: null, to: null, message: null }

export function startPlayback(from: ProviderId | null, to: ProviderId, sameProvider: boolean): HandoffState {
  if (sameProvider) return { phase: 'playing', from: to, to, message: null }
  return {
    phase: 'loading',
    from,
    to,
    message: `Memuat dari ${providerName(to)}…`,
  }
}

export function beginHandoff(from: ProviderId, to: ProviderId): HandoffState {
  return { phase: 'loading', from, to, message: `Memuat dari ${providerName(to)}…` }
}

export function resolveHandoff(state: HandoffState, outcome: 'success' | 'timeout'): HandoffState {
  if (state.phase !== 'loading' && state.phase !== 'warmup') return state
  if (outcome === 'success') {
    return { phase: 'playing', from: state.to, to: state.to, message: null }
  }
  const name = state.to ? providerName(state.to) : 'Layanan'
  return { phase: 'failed', from: state.from, to: state.to, message: `${name} tidak merespons. Dilewati.` }
}

export function handoffIsBlocking(state: HandoffState): boolean {
  return state.phase === 'loading' || state.phase === 'warmup'
}
