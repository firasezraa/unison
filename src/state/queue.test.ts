import { describe, expect, it } from 'vitest'
import { CATALOG } from '../data/catalog'
import { currentTrack, initialQueue, nextTrack, queueReducer } from './queue'

const [a, b, c] = CATALOG

describe('queueReducer', () => {
  it('replaces the queue and starts at the given index', () => {
    const state = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 1 })
    expect(state.items).toHaveLength(3)
    expect(currentTrack(state)?.id).toBe(b.id)
  })

  it('clamps an out-of-range start index instead of leaving a dangling current item', () => {
    const state = queueReducer(initialQueue, { type: 'replace', items: [a, b], startIndex: 9 })
    expect(currentTrack(state)?.id).toBe(b.id)
  })

  it('appends with add and never duplicates the same id', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a] })
    const s2 = queueReducer(s1, { type: 'add', track: b })
    const s3 = queueReducer(s2, { type: 'add', track: b })
    expect(s3.items.map((track) => track.id)).toEqual([a.id, b.id])
  })

  it('inserts playNext directly after the current item', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c] })
    const s2 = queueReducer(s1, { type: 'playNext', track: c })
    expect(s2.items.map((track) => track.id)).toEqual([a.id, c.id, b.id])
    expect(currentTrack(s2)?.id).toBe(a.id)
  })

  it('removing the current item keeps a valid currentIndex', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 1 })
    const s2 = queueReducer(s1, { type: 'remove', index: 1 })
    expect(s2.items.map((track) => track.id)).toEqual([a.id, c.id])
    expect(currentTrack(s2)?.id).toBe(c.id)
  })

  it('removing an item before the current one shifts the index so the same track keeps playing', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 2 })
    const s2 = queueReducer(s1, { type: 'remove', index: 0 })
    expect(currentTrack(s2)?.id).toBe(c.id)
  })

  it('removing every item resets the current item', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a] })
    const s2 = queueReducer(s1, { type: 'remove', index: 0 })
    expect(s2).toEqual({ items: [], currentIndex: -1 })
  })

  it('move out of range is a no-op and move within range reorders', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 0 })
    expect(queueReducer(s1, { type: 'move', from: 0, to: -1 }).items).toEqual(s1.items)
    expect(queueReducer(s1, { type: 'move', from: 2, to: 5 }).items).toEqual(s1.items)
    expect(queueReducer(s1, { type: 'move', from: 0, to: 2 }).items.map((track) => track.id)).toEqual([
      b.id,
      c.id,
      a.id,
    ])
  })

  it('moving the current item keeps currentIndex on that same track', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 0 })
    const s2 = queueReducer(s1, { type: 'move', from: 0, to: 2 })
    expect(currentTrack(s2)?.id).toBe(a.id)
  })

  it('advance clamps at the end and nextTrack is null there', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b], startIndex: 1 })
    const s2 = queueReducer(s1, { type: 'advance' })
    expect(s2.currentIndex).toBe(1)
    expect(nextTrack(s2)).toBeNull()
  })

  it('clear empties the queue and resets the index', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b], startIndex: 1 })
    expect(queueReducer(s1, { type: 'clear' })).toEqual({ items: [], currentIndex: -1 })
  })

  it('setIndex ignores indexes outside the queue', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b], startIndex: 0 })
    expect(queueReducer(s1, { type: 'setIndex', index: 7 })).toBe(s1)
    expect(currentTrack(queueReducer(s1, { type: 'setIndex', index: 1 }))?.id).toBe(b.id)
  })
})
