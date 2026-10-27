import type { Track } from '../domain/types'

export interface QueueState {
  items: Track[]
  currentIndex: number
}

export type QueueAction =
  | { type: 'replace'; items: Track[]; startIndex?: number }
  | { type: 'add'; track: Track }
  | { type: 'playNext'; track: Track }
  | { type: 'remove'; index: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'clear' }
  | { type: 'advance' }
  | { type: 'setIndex'; index: number }

export const initialQueue: QueueState = { items: [], currentIndex: -1 }

export function currentTrack(state: QueueState): Track | null {
  return state.items[state.currentIndex] ?? null
}

export function nextTrack(state: QueueState): Track | null {
  return state.items[state.currentIndex + 1] ?? null
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'replace': {
      if (action.items.length === 0) return { items: [], currentIndex: -1 }
      const start = action.startIndex ?? 0
      const currentIndex = Math.max(0, Math.min(start, action.items.length - 1))
      return { items: action.items, currentIndex }
    }
    case 'add': {
      if (state.items.some((track) => track.id === action.track.id)) return state
      const items = [...state.items, action.track]
      return { items, currentIndex: state.currentIndex === -1 ? 0 : state.currentIndex }
    }
    case 'playNext': {
      const rest = state.items.filter((track) => track.id !== action.track.id)
      const insertAt = state.currentIndex < 0 ? 0 : state.currentIndex + 1
      const items = [...rest.slice(0, insertAt), action.track, ...rest.slice(insertAt)]
      const currentIndex = state.currentIndex < 0 ? 0 : state.currentIndex
      return { items, currentIndex }
    }
    case 'remove': {
      const { index } = action
      if (index < 0 || index >= state.items.length) return state
      const items = state.items.filter((_, position) => position !== index)
      if (items.length === 0) return { items, currentIndex: -1 }
      let currentIndex = state.currentIndex
      if (index < currentIndex) currentIndex -= 1
      else if (index === currentIndex) currentIndex = Math.min(currentIndex, items.length - 1)
      return { items, currentIndex }
    }
    case 'move': {
      const { from, to } = action
      const length = state.items.length
      if (from < 0 || from >= length || to < 0 || to >= length || from === to) return state
      const items = [...state.items]
      const [moved] = items.splice(from, 1)
      items.splice(to, 0, moved)
      const currentId = state.items[state.currentIndex]?.id ?? null
      const currentIndex = currentId ? items.findIndex((track) => track.id === currentId) : -1
      return { items, currentIndex }
    }
    case 'clear':
      return { items: [], currentIndex: -1 }
    case 'advance': {
      if (state.items.length === 0) return state
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, state.items.length - 1) }
    }
    case 'setIndex': {
      if (action.index < 0 || action.index >= state.items.length) return state
      return { ...state, currentIndex: action.index }
    }
    default:
      return state
  }
}
