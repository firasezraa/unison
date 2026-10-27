# Unison Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive React prototype of Unison — one search, one queue, one player across several mock streaming services, including the cross-service handoff experience.

**Architecture:** Vite + React + TypeScript single-page app. Pure TypeScript modules hold queue logic, handoff state machine, and search orchestration so they are testable without a DOM; React components are thin and read from a single `UnisonProvider` context. Mock provider adapters stand behind the same interfaces a real provider will implement later.

**Tech Stack:** Vite, React, TypeScript, Vitest, `@fontsource/poppins`, plain CSS with custom properties (no Tailwind, no CSS framework).

**Spec:** `docs/superpowers/specs/2026-10-27-unison-prototype-design.md`

## Global Constraints

- Language of all UI copy: **Indonesian**, `sentence case`, sapaan **"kamu"**.
- Font: **Poppins** 400/500/700, self-hosted via `@fontsource/poppins`; fallback `"system-ui", sans-serif`; numeric displays use `font-variant-numeric: tabular-nums`.
- Tokens (light): `--bg #F1F2F6`, `--surface-1 #E7E9F0`, `--surface-2 #DADDE8`, `--ink #1B1838`, `--ink-muted #5B5978`, `--accent #F2B63C`, `--on-accent #1B1838`, `--focus #4A43B8`, `--danger #B42318`.
- Tokens (dark): `--bg #15122B`, `--surface-1 #1D1940`, `--surface-2 #2A2552`, `--ink #EFEDFA`, `--ink-muted #A7A3C9`, `--accent #F2B63C`, `--focus #F2B63C`, `--danger #FF7B6B`.
- Thread colors — light: SP `#15803D`, AM `#D1163A`, TD `#08707F`, YT `#C41208`, SC `#B54708`; dark: SP `#1ED760`, AM `#FF4D63`, TD `#3DDCEB`, YT `#FF3B2E`, SC `#FF7A1A`.
- Radius: badge 4px, row/input 6px, dialog 14px, artwork 4px. **No shadows. No decorative gradients.** Only gradient allowed: handoff thread blend.
- Accent is always a **fill** with ink text, never accent-colored text on a light background.
- Thread color appears only in three places: row thread (3px, 5px when playing), progress bar, handoff blend.
- Every service identity carries a 2-letter code (SP/AM/TD/YT/SC) — never color alone.
- Row height 56px desktop / 64px mobile; player bar 88px; mini-player 64px; tab bar 56px.
- Motion: press 90ms, open/close 180ms, sheet 260ms, handoff blend 240ms, loading loop 1200ms; all disabled under `prefers-reduced-motion: reduce`.
- Touch targets ≥ 44×44px; row actions always visible on coarse pointers (`@media (hover: none)`).
- Focus ring: 2px solid `var(--focus)` with 2px offset, always visible.
- Playback is an explicit **simulation** — no real audio, no provider SDK, no tokens, no network calls.
- No official provider logos; provider names used descriptively only.
- Every string is Indonesian and must match the exact copy in DESIGN.md §10 where that section defines one.

## Review Focus

- A track whose provider requires reconnection must stay in the queue and render its warning; it must never be silently dropped (spec: "Item dari layanan yang perlu sambung ulang tetap tampil dengan penanda").
- Handoff that never resolves must fall through after 8s: skip, explain, continue to the next item — the app must not stay stuck on the loading state.
- Queue reorder by keyboard must produce the same order as drag, and an out-of-range move (first item up, last item down) must be a no-op rather than an error.
- Removing or reordering the queue entry that is currently playing must not corrupt playback position or leave a dangling `currentId`.
- Search results arriving late from a slow provider must append below the existing list instead of re-sorting under the reader's cursor, and a failed provider must not blank the whole result group.
- A long, right-to-left, or multi-script title must not break row layout or truncation (`dir="auto"`, ellipsis, no wrap).

---

### Task 1: Scaffold the app, tokens, and Poppins

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`, `src/styles/app.css`, `.gitignore`
- Test: `src/styles/tokens.test.ts` (token presence smoke test is skipped; verification is `npm run build`)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run dev`, `npm run build`, `npm run test` scripts; CSS custom properties listed in Global Constraints; `src/App.tsx` default-exporting `App(): JSX.Element`.

- [ ] **Step 1: Initialize the project**

Run:
```bash
cd /home/ubuntu/Dev-Project && npm create vite@latest . -- --template react-ts --force && npm install
```
Then add dependencies:
```bash
npm install @fontsource/poppins
npm install -D vitest
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Write `src/styles/tokens.css`**

Declare `:root` with the light tokens, `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` with the dark tokens, plus `--t-sp/--t-am/--t-td/--t-yt/--t-sc`, radii, and the `@media (prefers-reduced-motion: reduce)` reset that forces `animation-duration`/`transition-duration` to `0.01ms`.

- [ ] **Step 3: Write `src/styles/app.css`**

Base layer only: `body` uses `var(--bg)`, `var(--ink)`, `font-family: "Poppins", system-ui, sans-serif`; `:focus-visible` ring; `.tabular { font-variant-numeric: tabular-nums; }`. No component styles yet.

- [ ] **Step 4: Wire fonts and stylesheet in `src/main.tsx`**

Import `@fontsource/poppins/400.css`, `/500.css`, `/700.css`, then `./styles/tokens.css`, then `./styles/app.css`, then render `<App />` into `#root`.

- [ ] **Step 5: Make `src/App.tsx` render a placeholder shell with a theme switch**

`App` renders `<main>` containing an `<h1>Unison</h1>` and a button toggling `document.documentElement.dataset.theme` between `light` and `dark`—temporary, replaced in Task 6.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: exit 0, `dist/` produced, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Vite React TypeScript app with Unison design tokens"
```

---

### Task 2: Domain model and mock catalog

**Files:**
- Create: `src/domain/types.ts`, `src/data/providers.ts`, `src/data/catalog.ts`
- Test: `src/data/catalog.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ProviderId = 'sp' | 'am' | 'td' | 'yt' | 'sc'`
  - `interface Provider { id: ProviderId; code: string; name: string; status: 'connected' | 'needs-reconnect' | 'disconnected'; capabilities: { playback: boolean; libraryRead: boolean; playlistWrite: boolean }; requirement: string; summary: string }`
  - `interface Track { id: string; provider: ProviderId; title: string; artist: string; album: string; durationMs: number; artwork?: string | null; available: boolean }`
  - `interface Playlist { id: string; name: string; description: string; trackIds: string[] }`
  - `PROVIDERS: Record<ProviderId, Provider>`, `PROVIDER_LIST: Provider[]`
  - `CATALOG: Track[]`, `PLAYLISTS: Playlist[]`, `EMPTY_ARTWORK_TRACK_ID: string`
  - `searchCatalog(provider: ProviderId, query: string): Track[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { CATALOG, PLAYLISTS, PROVIDER_LIST } from './catalog'
import { searchCatalog } from './catalog'

describe('catalog', () => {
  it('contains tracks for every provider and at least one unavailable track', () => {
    const providers = new Set(CATALOG.map((t) => t.provider))
    expect(providers.size).toBeGreaterThanOrEqual(4)
    expect(CATALOG.some((t) => !t.available)).toBe(true)
  })
  it('searches case-insensitively across title and artist within one provider', () => {
    const hits = searchCatalog('am', 'HUJAN')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((t) => t.provider === 'am')).toBe(true)
  })
  it('returns an empty list for a query with no match', () => {
    expect(searchCatalog('sp', 'zzzzzz')).toEqual([])
  })
  it('every provider is connected except spotify which needs reconnect, and youtube which is disconnected', () => {
    const byId = Object.fromEntries(PROVIDER_LIST.map((p) => [p.id, p.status]))
    expect(byId.am).toBe('connected')
    expect(byId.sp).toBe('needs-reconnect')
    expect(byId.yt).toBe('disconnected')
  })
  it('playlists reference existing track ids', () => {
    const ids = new Set(CATALOG.map((t) => t.id))
    for (const playlist of PLAYLISTS) {
      for (const id of playlist.trackIds) expect(ids.has(id)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/catalog.test.ts`
Expected: FAIL — cannot resolve `./catalog`.

- [ ] **Step 3: Implement types and seed data**

Write `src/domain/types.ts` with the interfaces above verbatim. In `src/data/catalog.ts`, create 14–18 tracks spread across `am`, `sp`, `td`, `yt`, `sc`; include at least one Indonesian title, one Japanese title (e.g. `夜に駆ける`), one Arabic title, one `available: false` track, and one track with `artwork: null`. Duration 20–40 seconds each so a full queue can be demoed quickly.

In `src/data/providers.ts`, export `PROVIDERS` keyed by id with `code` of `SP`, `AM`, `TD`, `YT`, `SC`, the Indonesian capability sentences from DESIGN.md §6.4, and `status` per the test above.

- [ ] **Step 4: Add `searchCatalog`**

`searchCatalog(provider, query)` lowercases both sides, trims the query, matches `title` or `artist` substring, returns `Track[]` in catalog order. Empty query returns `[]`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/catalog.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domain src/data && git commit -m "feat: add provider/track domain model and mock catalog"
```

---

### Task 3: Queue reducer

**Files:**
- Create: `src/state/queue.ts`
- Test: `src/state/queue.test.ts`

**Interfaces:**
- Consumes: `Track`, `ProviderId` from `src/domain/types.ts`.
- Produces:
  - `interface QueueState { items: Track[]; currentIndex: number }`
  - `type QueueAction = { type: 'replace'; items: Track[]; startIndex?: number } | { type: 'add'; track: Track } | { type: 'playNext'; track: Track } | { type: 'remove'; index: number } | { type: 'move'; from: number; to: number } | { type: 'clear' } | { type: 'advance' } | { type: 'setIndex'; index: number }`
  - `queueReducer(state: QueueState, action: QueueAction): QueueState`
  - `initialQueue: QueueState`
  - `currentTrack(state: QueueState): Track | null`
  - `nextTrack(state: QueueState): Track | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { CATALOG } from '../data/catalog'
import { currentTrack, initialQueue, nextTrack, queueReducer } from './queue'

const [a, b, c] = CATALOG

describe('queueReducer', () => {
  it('replaces the queue and starts at the given index', () => {
    const s = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 1 })
    expect(s.items).toHaveLength(3)
    expect(currentTrack(s)?.id).toBe(b.id)
  })
  it('appends a track with add and never duplicates the same id', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a] })
    const s2 = queueReducer(s1, { type: 'add', track: b })
    const s3 = queueReducer(s2, { type: 'add', track: b })
    expect(s3.items.map((t) => t.id)).toEqual([a.id, b.id])
  })
  it('inserts playNext directly after the current item', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c] })
    const s2 = queueReducer(s1, { type: 'playNext', track: c })
    expect(s2.items.map((t) => t.id)).toEqual([a.id, c.id, b.id])
  })
  it('removing the current item keeps a valid currentIndex', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 1 })
    const s2 = queueReducer(s1, { type: 'remove', index: 1 })
    expect(s2.items.map((t) => t.id)).toEqual([a.id, c.id])
    expect(currentTrack(s2)?.id).toBe(c.id)
  })
  it('removing an item before the current one shifts the index so the same track keeps playing', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 2 })
    const s2 = queueReducer(s1, { type: 'remove', index: 0 })
    expect(currentTrack(s2)?.id).toBe(c.id)
  })
  it('move out of range is a no-op and move within range reorders', () => {
    const s1 = queueReducer(initialQueue, { type: 'replace', items: [a, b, c], startIndex: 0 })
    expect(queueReducer(s1, { type: 'move', from: 0, to: -1 }).items).toEqual(s1.items)
    expect(queueReducer(s1, { type: 'move', from: 2, to: 5 }).items).toEqual(s1.items)
    expect(queueReducer(s1, { type: 'move', from: 0, to: 2 }).items.map((t) => t.id)).toEqual([b.id, c.id, a.id])
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/queue.test.ts`
Expected: FAIL — cannot resolve `./queue`.

- [ ] **Step 3: Implement `queueReducer`**

Pure function, no mutation. `initialQueue = { items: [], currentIndex: -1 }`. `replace` sets `currentIndex` to `startIndex ?? 0` clamped into range (or `-1` when empty). `add` ignores a track id already present. `remove` drops the item and decrements `currentIndex` when `index < currentIndex`, keeps it when `index > currentIndex`, and clamps when the removed item was current (stays at the same position, i.e. the next item becomes current; if it was last, clamp to new length − 1; empty queue → `-1`). `move` returns state untouched when either index is out of range, otherwise splice-moves and recomputes `currentIndex` as the new index of the previously current track. `advance` increments but never past `items.length - 1`. `setIndex` ignores out-of-range values.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/queue.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/queue.ts src/state/queue.test.ts && git commit -m "feat: add pure queue reducer with reorder and removal rules"
```

---

### Task 4: Handoff state machine

**Files:**
- Create: `src/state/handoff.ts`
- Test: `src/state/handoff.test.ts`

**Interfaces:**
- Consumes: `ProviderId` from `src/domain/types.ts`.
- Produces:
  - `type HandoffPhase = 'idle' | 'warmup' | 'loading' | 'playing' | 'failed'`
  - `interface HandoffState { phase: HandoffPhase; from: ProviderId | null; to: ProviderId | null; message: string | null }`
  - `const HANDOFF_TIMEOUT_MS = 8000`
  - `function startPlayback(from: ProviderId | null, to: ProviderId, sameProvider: boolean): HandoffState`
  - `function beginHandoff(from: ProviderId, to: ProviderId): HandoffState`
  - `function resolveHandoff(state: HandoffState, outcome: 'success' | 'timeout'): HandoffState`
  - `function handoffIsBlocking(state: HandoffState): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { handoffIsBlocking, startPlayback, beginHandoff, resolveHandoff } from './handoff'

describe('handoff state machine', () => {
  it('same-provider playback goes straight to playing with no message', () => {
    const s = startPlayback('am', 'am', true)
    expect(s.phase).toBe('playing')
    expect(s.message).toBeNull()
  })
  it('cross-provider playback starts in loading with the Indonesian message', () => {
    const s = startPlayback('am', 'sp', false)
    expect(s.phase).toBe('loading')
    expect(s.message).toBe('Memuat dari Spotify…')
    expect(s.from).toBe('am')
    expect(s.to).toBe('sp')
  })
  it('loading blocks interaction with the same track until it resolves', () => {
    expect(handoffIsBlocking(beginHandoff('am', 'sp'))).toBe(true)
    expect(handoffIsBlocking(startPlayback('am', 'am', true))).toBe(false)
  })
  it('success resolves to playing and clears the message', () => {
    const s = resolveHandoff(beginHandoff('am', 'sp'), 'success')
    expect(s.phase).toBe('playing')
    expect(s.message).toBeNull()
  })
  it('timeout resolves to failed with the reason users see', () => {
    const s = resolveHandoff(beginHandoff('am', 'sp'), 'timeout')
    expect(s.phase).toBe('failed')
    expect(s.message).toBe('Spotify tidak merespons. Dilewati.')
  })
  it('resolving from idle is a no-op', () => {
    const idle = { phase: 'idle' as const, from: null, to: null, message: null }
    expect(resolveHandoff(idle, 'success')).toEqual(idle)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/handoff.test.ts`
Expected: FAIL — cannot resolve `./handoff`.

- [ ] **Step 3: Implement the state machine**

Provider display names come from `PROVIDERS[id].name`; the loading message is `` `Memuat dari ${name}…` `` and the timeout message is `` `${name} tidak merespons. Dilewati.` ``. `resolveHandoff` returns the state unchanged unless `phase === 'loading'`. `handoffIsBlocking` is true for `loading` and `warmup`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/handoff.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/handoff.ts src/state/handoff.test.ts && git commit -m "feat: add handoff state machine with timeout messaging"
```

---

### Task 5: Search orchestration with per-provider isolation

**Files:**
- Create: `src/state/search.ts`
- Test: `src/state/search.test.ts`

**Interfaces:**
- Consumes: `PROVIDERS`, `searchCatalog` from `src/data/catalog`; `ProviderId`, `Track`.
- Produces:
  - `interface ProviderResult { provider: ProviderId; status: 'pending' | 'ok' | 'error'; tracks: Track[] }`
  - `interface SearchState { query: string; results: ProviderResult[] }`
  - `type SearchEvent = { type: 'query'; query: string; providers: ProviderId[] } | { type: 'results'; provider: ProviderId; tracks: Track[] } | { type: 'error'; provider: ProviderId } | { type: 'retry'; provider: ProviderId }`
  - `searchReducer(state: SearchState, event: SearchEvent): SearchState`
  - `flattenResults(state: SearchState): Track[]`
  - `providerDelay(provider: ProviderId): number` (mock latency, ms)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { flattenResults, searchReducer } from './search'

const empty = { query: '', results: [] }

describe('searchReducer', () => {
  it('a new query resets results to pending rows in the requested provider order', () => {
    const s = searchReducer(empty, { type: 'query', query: 'hujan', providers: ['am', 'sp'] })
    expect(s.results.map((r) => r.provider)).toEqual(['am', 'sp'])
    expect(s.results.every((r) => r.status === 'pending')).toBe(true)
  })
  it('late results append without disturbing existing row order', () => {
    let s = searchReducer(empty, { type: 'query', query: 'hujan', providers: ['am', 'sp'] })
    s = searchReducer(s, { type: 'results', provider: 'am', tracks: [] })
    const before = s.results.map((r) => r.provider)
    s = searchReducer(s, { type: 'results', provider: 'sp', tracks: [] })
    expect(s.results.map((r) => r.provider)).toEqual(before)
  })
  it('a failing provider is marked error and keeps other rows intact', () => {
    let s = searchReducer(empty, { type: 'query', query: 'hujan', providers: ['am', 'td'] })
    s = searchReducer(s, { type: 'results', provider: 'am', tracks: [] })
    s = searchReducer(s, { type: 'error', provider: 'td' })
    const byProvider = Object.fromEntries(s.results.map((r) => [r.provider, r.status]))
    expect(byProvider.am).toBe('ok')
    expect(byProvider.td).toBe('error')
  })
  it('retry returns only that provider to pending without clearing the query', () => {
    let s = searchReducer(empty, { type: 'query', query: 'hujan', providers: ['am', 'td'] })
    s = searchReducer(s, { type: 'error', provider: 'td' })
    s = searchReducer(s, { type: 'retry', provider: 'td' })
    expect(s.query).toBe('hujan')
    expect(s.results.find((r) => r.provider === 'td')?.status).toBe('pending')
  })
  it('events for providers not in the current query are ignored', () => {
    const s = searchReducer(empty, { type: 'query', query: 'hujan', providers: ['am'] })
    expect(searchReducer(s, { type: 'error', provider: 'sp' })).toEqual(s)
  })
  it('flattenResults joins ok rows in order and skips pending/error rows', () => {
    let s = searchReducer(empty, { type: 'query', query: 'hujan', providers: ['am', 'sp'] })
    s = searchReducer(s, { type: 'error', provider: 'sp' })
    s = searchReducer(s, { type: 'results', provider: 'am', tracks: CATALOG_AM_ONLY })
    expect(flattenResults(s)).toHaveLength(CATALOG_AM_ONLY.length)
  })
})
```

Add at the top of that test file: `const CATALOG_AM_ONLY = searchCatalog('am', 'hujan')` imported from `../data/catalog`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/search.test.ts`
Expected: FAIL — cannot resolve `./search`.

- [ ] **Step 3: Implement the reducer**

`query` replaces `results` with one pending row per requested provider, preserving the given order, and stores the trimmed query. `results`/`error`/`retry` update only the matching row and are ignored when no row matches. `flattenResults` concatenates `tracks` from rows with `status === 'ok'`. `providerDelay` returns fixed mock latencies: `am: 250`, `sp: 900`, `td: 1800`, `yt: 600`, `sc: 1200` (so the slowest provider visibly appends late; `td` is the one used for the error demo).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/search.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/search.ts src/state/search.test.ts && git commit -m "feat: add search reducer with per-provider isolation and late append"
```

---

### Task 6: App shell, routing, and theme context

**Files:**
- Create: `src/app/AppShell.tsx`, `src/app/Sidebar.tsx`, `src/app/useHashRoute.ts`, `src/app/UnisonContext.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`
- Test: none (verified in browser in Step 5)

**Interfaces:**
- Consumes: `PROVIDERS`, `PLAYLISTS`, `CATALOG`.
- Produces:
  - `type Route = { name: 'beranda' } | { name: 'cari' } | { name: 'library'; tab?: 'lagu' | 'album' | 'artis' | 'playlist' } | { name: 'playlist'; id: string } | { name: 'koneksi' } | { name: 'pengaturan' }`
  - `useHashRoute(): [Route, (route: Route) => void]` — reads/writes `#/cari`, `#/library`, `#/playlist/:id`, `#/koneksi`, `#/pengaturan`, `#/` for beranda.
  - `UnisonProvider` context exposing `{ theme, setTheme, providers, queue, dispatchQueue, handoff, playTrack, queueTrack, playNext, toggle, seek, volume, setVolume, toast, toasts, dismissToast }` — filled in progressively by later tasks; this task lands only `theme`, `setTheme`, and `providers`.

- [ ] **Step 1: Implement `useHashRoute`**

Parse `location.hash` into a `Route`, defaulting to `{ name: 'beranda' }`; subscribe to `hashchange`; the setter writes `location.hash` with the mapping above.

- [ ] **Step 2: Implement `Sidebar`**

Brand block (wordmark `unison` with the three-line logo SVG from DESIGN.md §5, `stroke="currentColor"`), then nav links Beranda / Cari / Library / Koneksi, then a "Playlist" group listing `PLAYLISTS` names, then Pengaturan at the bottom. Active link uses `aria-current="page"` and a Kuning Nada left rule. At `768–1023px` the sidebar collapses to a 72px icon rail.

- [ ] **Step 3: Implement `AppShell`**

CSS grid: `248px minmax(0,1fr) 320px` at `≥1280px`, `248px minmax(0,1fr)` at `1024–1279`, `72px minmax(0,1fr)` at `768–1023`, and single column with bottom tab bar below 768px. Third column renders `children` slot `aside` when the queue panel is provided. Reserve the bottom 88px for the player bar. Content is left-aligned, `max-width: 1100px`.

- [ ] **Step 4: Wire `UnisonProvider` theme into `App.tsx`**

`theme` is `'light' | 'dark' | 'system'`; `system` follows `matchMedia('(prefers-color-scheme: dark)')` and sets `document.documentElement.dataset.theme` accordingly. Render `AppShell` with the sidebar and route-switched placeholder content (real views arrive in later tasks).

- [ ] **Step 5: Verify in browser**

Run: `npm run dev -- --host 0.0.0.0` and open the URL. Check: sidebar navigation changes the hash, reload keeps the view, theme follows OS and can be forced, no console errors, and layout holds at 1440px, 1100px, 900px, and 390px widths.

- [ ] **Step 6: Commit**

```bash
git add src/app src/App.tsx src/styles/app.css && git commit -m "feat: add app shell, hash routing, and theme provider"
```

---

### Task 7: Core presentational pieces — badge, thread, row, artwork fallback

**Files:**
- Create: `src/components/ProviderBadge.tsx`, `src/components/ThreadBar.tsx`, `src/components/TrackRow.tsx`, `src/components/Artwork.tsx`
- Modify: `src/styles/app.css`
- Test: none (browser verification)

**Interfaces:**
- Consumes: `Track`, `ProviderId`, `PROVIDERS`.
- Produces:
  - `<ProviderBadge provider={ProviderId} size?: 'sm' | 'md' />` — 4px radius, 20px high, 2-letter code, 16% thread tint background, ink text, `aria-label={`Sumber: ${name}`}`, `title={name}`.
  - `<ThreadBar provider={ProviderId} active?: boolean />` — 3px (5px when `active`) full-height left inset line, `aria-hidden="true"`.
  - `<TrackRow track={Track} index?: number} isCurrent?={boolean} onPlay?={() => void} onQueue?={() => void} onPlayNext?={() => void} showProviderCode?={boolean} />` — 56px desktop / 64px mobile row, 40px artwork, title `text-base` weight 500 with `dir="auto"` and single-line ellipsis, artist `text-sm` muted, right-aligned tabular duration, hover background `var(--surface-2)`, current row shows a playing glyph instead of the index and weight 700, unavailable rows are muted with the label "Tidak tersedia" and are not clickable, needs-reconnect providers render a warning badge with text "Sambung ulang".
  - `<Artwork track={Track} size?: number />` — image if present (never cropped or overlaid), otherwise `var(--surface-2)` block with the provider code centered and a thread line at the bottom edge.

- [ ] **Step 1: Implement the four components**

Follow the specs above exactly; the row is a `<li>` containing a button for the play action plus sibling icon buttons so the row stays fully keyboard-operable. Row actions (add to queue, play next) are hidden at `hover: none` media queries so they are always visible on touch. All icon buttons get `aria-label` in Indonesian ("Tambahkan ke antrean", "Putar berikutnya", "Putar <title>").

- [ ] **Step 2: Add row and badge styles to `app.css`**

Use tokens only. No box-shadow anywhere. Duration and time labels get `font-variant-numeric: tabular-nums`.

- [ ] **Step 3: Verify in browser**

Render a scratch list of five rows in one view (temporary, removed in Task 8) to confirm: thread visible at 3px, current row thread at 5px, long Japanese/Arabic titles ellipsize without wrapping, unavailable row is visibly muted and not focusable as a play action, hover background is `surface-2`.

- [ ] **Step 4: Commit**

```bash
git add src/components src/styles/app.css && git commit -m "feat: add track row, provider badge, thread bar, and artwork fallback"
```

---

### Task 8: Search view

**Files:**
- Create: `src/views/SearchView.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`
- Test: none (browser verification of real timers)

**Interfaces:**
- Consumes: `searchReducer`, `flattenResults`, `providerDelay`, `TrackRow`, `PROVIDERS`, `UnisonProvider` (`playTrack`, `queueTrack`).
- Produces: `<SearchView />` rendering the search input, grouped results, and per-provider status lines.

- [ ] **Step 1: Implement the search input and dispatch loop**

Input is a labelled `<input type="search">` with placeholder `Cari lagu, album, artis…`. On each debounce-free keystroke, dispatch `query` with the ordered ids of connected providers (`status !== 'disconnected'`). For each provider, `setTimeout(providerDelay(id))` then dispatch `results` (or `error` if the provider is `td` **and** the query starts with the letter `x` — a deterministic error trigger documented in the UI-less demo notes). Clear pending timers on unmount and on a new query.

- [ ] **Step 2: Render groups and honest status lines**

One group per provider row that is `ok`, in reducer order, each with a heading of the provider name and its `TrackRow`s. Pending rows show a subtle "Mencari di …" line. Error rows render `Hasil dari TIDAL belum tersedia.` followed by a text button `Coba lagi` dispatching `retry` and re-running that provider. Empty overall query shows no groups. No-results state uses the exact copy: `Tidak ada hasil untuk "<query>". Coba kata kunci lain atau hubungkan layanan tambahan.`

- [ ] **Step 3: Keyboard shortcut**

`/` focuses the search input unless the event target is an input/textarea/contenteditable.

- [ ] **Step 4: Verify in browser**

Search `hujan`: Apple Music results appear first, Spotify and SoundCloud follow without the list jumping, TIDAL arrives last and appends at the bottom. Then search `xhujan` to confirm the TIDAL error line and that other results still show, and that `Coba lagi` retries only TIDAL.

- [ ] **Step 5: Commit**

```bash
git add src/views/SearchView.tsx src/App.tsx src/styles/app.css && git commit -m "feat: add unified search view with honest per-provider status"
```

---

### Task 9: Mock playback engine and player bar

**Files:**
- Create: `src/state/playback.ts`, `src/components/PlayerBar.tsx`, `src/components/ThreadProgress.tsx`
- Modify: `src/app/UnisonContext.tsx`, `src/App.tsx`, `src/styles/app.css`
- Test: `src/state/playback.test.ts`

**Interfaces:**
- Consumes: `queueReducer`, `currentTrack`, `nextTrack`, `handoff` functions, `HANDOFF_TIMEOUT_MS`.
- Produces:
  - `interface PlaybackState { positionMs: number; isPlaying: boolean }`
  - `advancePlayback(state: PlaybackState, deltaMs: number, durationMs: number): PlaybackState` — advances position, clamps, sets `isPlaying: false` at the end.
  - `<ThreadProgress progress={number} from={ProviderId} to={ProviderId | null} loading={boolean} />` — 3px thread, 6px on hover/drag/focus, `role="slider"`, `aria-valuemin/max/now`, `aria-valuetext` formatted as `"2 menit 14 detik dari 3 menit 40 detik"`, thumb visible on hover/focus, gradient blend between `from` and `to` only while `loading`.
  - `<PlayerBar />` — 88px bar: artwork, title + artist, previous/play/next, thread progress, `m:ss / m:ss` tabular times, volume slider, source label `Putar dari: <name>` (static in MVP), plus a `Kode sumber` badge. Playing state shows a loading label under the title from `handoff.message`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { advancePlayback } from './playback'

describe('advancePlayback', () => {
  it('advances position while playing', () => {
    expect(advancePlayback({ positionMs: 0, isPlaying: true }, 500, 30000).positionMs).toBe(500)
  })
  it('clamps at duration and stops', () => {
    const s = advancePlayback({ positionMs: 29500, isPlaying: true }, 1000, 30000)
    expect(s.positionMs).toBe(30000)
    expect(s.isPlaying).toBe(false)
  })
  it('does not advance while paused', () => {
    const s = advancePlayback({ positionMs: 1000, isPlaying: false }, 500, 30000)
    expect(s).toEqual({ positionMs: 1000, isPlaying: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/playback.test.ts`
Expected: FAIL — cannot resolve `./playback`.

- [ ] **Step 3: Implement `advancePlayback` and pass the test**

Run: `npx vitest run src/state/playback.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 4: Implement the playback driver in `UnisonContext`**

A single `setInterval(250ms)` drives `advancePlayback`. On reaching duration: if the next track exists and its provider equals the current one, load it (`startPlayback(from, to, true)`) and continue; otherwise dispatch `beginHandoff(from, to)` and schedule either success after **900ms** or, when the demo "paksa gagal" flag is on for that provider, `resolveHandoff(timeout)` after `HANDOFF_TIMEOUT_MS`. On success, advance the queue and play. On timeout, show the toast `Spotify tidak merespons. Dilewati.` and advance to the next item. Expose `playTrack(track, queueContext?)`, `toggle()`, `seek(ms)`, `volume`/`setVolume`, and a `demoFailNextHandoff` toggle used by the demo bar in Task 10. Provider with `status === 'needs-reconnect'` cannot start playback: show toast `Sambungan ke Spotify berakhir. Sambungkan ulang untuk memutar lagu dari Spotify.` with action `Sambungkan ulang` linking to `#/koneksi`.

- [ ] **Step 5: Implement `ThreadProgress` and `PlayerBar`**

Follow the specs above; announce track changes with a polite live region (`aria-live="polite"`) containing `<title> — <artist>` and, while loading, the handoff message. Player region is `role="region"` with `aria-label="Pemutar"`. Keyboard: Space toggles unless focus is in a text field, `←`/`→` seek ±5s, `Shift+←`/`Shift+→` previous/next, `↑`/`↓` volume.

- [ ] **Step 6: Verify in browser**

Play a track from search: bar fills, times update, thread takes the provider color, Space pauses, arrows seek, next/prev work. Set the demo handoff to fail and confirm the bar shows `Memuat dari …`, shifts thread color, then shows the failure toast and moves on. Enable OS reduced motion and confirm the loading loop stops while the status text still shows.

- [ ] **Step 7: Commit**

```bash
git add src/state/playback.ts src/state/playback.test.ts src/components/ThreadProgress.tsx src/components/PlayerBar.tsx src/app/UnisonContext.tsx && git commit -m "feat: add mock playback engine, thread progress, and player bar"
```

---

### Task 10: Queue panel with keyboard reorder and demo controls

**Files:**
- Create: `src/components/QueuePanel.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`
- Test: none (browser verification)

**Interfaces:**
- Consumes: queue state, `dispatchQueue`, `playTrack`, `PROVIDERS`.
- Produces: `<QueuePanel />` with sections "Sedang diputar" and "Berikutnya", per-item `Naikkan`/`Turunkan` buttons dispatching `move`, remove buttons, "Kosongkan antrean" with an inline cancelable confirmation, and a demo block containing a `Paksa gagal handoff` switch.

- [ ] **Step 1: Implement the panel**

Items render with `TrackRow`; the current item's row is highlighted. Reorder buttons are icon buttons with `aria-label` and are disabled at the boundaries. As a visual affordance, also support drag with `draggable` + `onDragOver`/`onDrop`, but keyboard buttons are the guaranteed path. Items from providers needing reconnect stay listed with their warning. Clear-queue flows through a confirmation row: `Kosongkan antrean?` with `Kosongkan` and `Batal`.

- [ ] **Step 2: Add the queue toggle shortcut and layout slots**

`Q` toggles the queue panel; below 1280px it renders as a slide-over drawer with a scrim (`--bg` at 60% opacity) and closes on Escape. Below 768px the queue is a tab within the now-playing sheet rather than a drawer.

- [ ] **Step 3: Verify in browser**

Build a queue of five mixed-provider tracks, move the third item up twice with the keyboard, confirm the order matches repeated drags, confirm boundaries are disabled, remove the currently playing item and check playback continues with a valid track, then clear the queue with confirmation.

- [ ] **Step 4: Commit**

```bash
git add src/components/QueuePanel.tsx src/App.tsx src/styles/app.css && git commit -m "feat: add queue panel with keyboard reorder and demo handoff controls"
```

---

### Task 11: Now playing sheet, mini-player, and bottom tab bar

**Files:**
- Create: `src/components/MiniPlayer.tsx`, `src/components/NowPlayingSheet.tsx`, `src/components/TabBar.tsx`
- Modify: `src/app/AppShell.tsx`, `src/styles/app.css`
- Test: none (browser verification)

**Interfaces:**
- Consumes: `PlayerBar` internals (extract shared `TransportControls` from Task 9 into `src/components/TransportControls.tsx` if `PlayerBar` duplicates them), queue state.
- Produces: `<MiniPlayer />` (64px, artwork + title/artist + play/pause, 2px progress thread on the top edge, opens the sheet), `<NowPlayingSheet />` (full-screen sheet below 768px with sample artwork, title + artist, provider badge, thread progress, times, transport, `Putar dari: <name>`, and an `Antrean` tab), `<TabBar />` (56px, Beranda/Cari/Library/Antrean).

- [ ] **Step 1: Implement the three components**

Sheet slides in over 260ms and respects reduced motion. Focus moves into the sheet on open and returns to the mini-player on close; `Escape` closes it; background content gets `aria-hidden` while it is open. All touch targets ≥44px.

- [ ] **Step 2: Integrate at the small breakpoint**

Below 768px the shell renders `MiniPlayer` above `TabBar`, hides the desktop `PlayerBar`, and shows the sheet when the mini-player is tapped or `Antrean` is selected.

- [ ] **Step 3: Verify in browser**

At 390px width, confirm the mini-player sits above the tab bar, the sheet opens and closes by tap and Escape, focus returns correctly, the `Antrean` tab lists the queue with working reorder buttons, and nothing overlaps at 200% zoom.

- [ ] **Step 4: Commit**

```bash
git add src/components src/app/AppShell.tsx src/styles/app.css && git commit -m "feat: add mobile mini-player, now playing sheet, and tab bar"
```

---

### Task 12: Connections screen

**Files:**
- Create: `src/views/ConnectionsView.tsx`
- Modify: `src/App.tsx`, `src/app/UnisonContext.tsx`, `src/styles/app.css`
- Test: none (browser verification)

**Interfaces:**
- Consumes: `PROVIDER_LIST`, provider status mutators from context (`setProviderStatus(id, status)`).
- Produces: `<ConnectionsView />` — rows (not cards) with thread line, provider name, status, one honest sentence of capability, and a single action button whose label depends on status: `Putuskan` (connected), `Sambungkan ulang` (needs-reconnect), `Hubungkan` (disconnected). Actions mutate local mock state and fire a toast: `Spotify terhubung`, `Spotify diputuskan`, `Spotify perlu disambungkan ulang`.

- [ ] **Step 1: Implement the view**

Header copy: `Layanan yang terhubung menentukan apa yang bisa dicari dan diputar.` Each row states requirements plainly (e.g. `Butuh Premium. Putar di desktop.`) from the provider data. Add a note under the list: `Ini prototipe. Koneksi hanya disimulasikan dan tidak ada akun yang benar-benar terhubung.`

- [ ] **Step 2: Verify in browser**

Toggle each provider through its states, confirm the action label and toast copy match, and confirm that a disconnected provider disappears from search results on the next query while its queued tracks stay visible with a marker.

- [ ] **Step 3: Commit**

```bash
git add src/views/ConnectionsView.tsx src/App.tsx src/app/UnisonContext.tsx && git commit -m "feat: add connections screen with simulated provider states"
```

---

### Task 13: Home, Library, Playlist, and Settings views

**Files:**
- Create: `src/views/HomeView.tsx`, `src/views/LibraryView.tsx`, `src/views/PlaylistView.tsx`, `src/views/SettingsView.tsx`
- Modify: `src/App.tsx`, `src/styles/app.css`
- Test: none (browser verification)

**Interfaces:**
- Consumes: `PLAYLISTS`, `CATALOG`, `TrackRow`, context actions, theme state.
- Produces: four views wired into the router.

- [ ] **Step 1: Home**

Sections `Lanjutkan mendengar` (last queue items, or the empty line `Belum ada yang diputar.` with a `Cari lagu` action) and `Playlist terbaru` (three playlist rows linking to `#/playlist/:id`). No algorithmic recommendations.

- [ ] **Step 2: Library**

Tabs Lagu / Album / Artis / Playlist, per-provider filter chips, a `Muat ulang` button that clears the filter and shows a simulated per-provider progress line (`Spotify: 400 dari 1.200 lagu`) for 2s. Empty state uses the exact copy: `Library masih kosong. Muat library dari layanan yang terhubung.` with `Muat library`.

- [ ] **Step 3: Playlist**

Header with title, track count, and provider count; `Putar` and `Acak` buttons; the track list; unavailable tracks marked. `Putar` replaces the queue with the playlist starting at index 0.

- [ ] **Step 4: Settings**

Sections Tampilan (Terang/Gelap/Sistem radio group bound to `theme`), Bahasa (Indonesia selected, English disabled with note `Belum tersedia di prototipe`), Prioritas layanan (up/down buttons reordering a local list, persisted to `localStorage`), and Privasi & data (a plain explanation of what the prototype stores — theme and priority order in `localStorage`, nothing else — plus a `Hapus data lokal` button that clears it and toasts `Data lokal dihapus`).

- [ ] **Step 5: Verify in browser**

Navigate every route directly by hash URL, confirm each view renders without console errors, playlist play fills the queue, and priority reordering survives a reload.

- [ ] **Step 6: Commit**

```bash
git add src/views src/App.tsx src/styles/app.css && git commit -m "feat: add home, library, playlist, and settings views"
```

---

### Task 14: Toasts, shortcuts dialog, and accessibility pass

**Files:**
- Create: `src/components/ToastRegion.tsx`, `src/components/ShortcutsDialog.tsx`
- Modify: `src/app/UnisonContext.tsx`, `src/App.tsx`, `src/styles/app.css`
- Test: none (manual a11y verification)

**Interfaces:**
- Consumes: `toasts` from context.
- Produces: `<ToastRegion />` and `<ShortcutsDialog />`.

- [ ] **Step 1: Toasts**

Stack above the player bar / mini-player, never covering transport controls, auto-dismiss after 4s, one optional action, `aria-live="polite"`, dismissible by button and Escape.

- [ ] **Step 2: Shortcuts dialog**

`?` opens a `<dialog>`-based panel listing Space, `←`/`→`, `Shift`+arrows, `↑`/`↓`, `/`, `Q`, `?` with their Indonesian descriptions; focus trapped while open, Escape closes, focus returns to the trigger.

- [ ] **Step 3: Accessibility pass over existing screens**

Verify and fix: single `<h1>` per view, logical heading order, landmarks (`nav`, `main`, `aside`), every icon-only button labelled, `role="slider"` progress with `aria-valuetext`, `dir="auto"` on all titles/artists, forced-colors fallback (thread becomes a bordered line with the code visible), no `outline: none`, and text usable at 200% zoom and 360px width.

- [ ] **Step 4: Verify with keyboard only**

Tab through search → row → player → queue, operate everything without a mouse, confirm the focus ring is always visible and that no shortcut steals keys while typing in an input.

- [ ] **Step 5: Commit**

```bash
git add src/components src/app src/styles/app.css && git commit -m "feat: add toast region and shortcuts dialog, close accessibility gaps"
```

---

### Task 15: Final verification

**Files:**
- Modify: `README.md` (create if missing)
- Test: full suite

- [ ] **Step 1: Run the full suite and build**

Run: `npm run test && npm run build`
Expected: all tests pass; build exits 0.

- [ ] **Step 2: Write `README.md`**

Contents: what the prototype is and is not (simulation only, no real audio/OAuth/accounts), how to run (`npm install`, `npm run dev`, `npm run test`), the hash routes, the demo triggers (TIDAL error on a query starting with `x`, `Paksa gagal handoff` switch), the keyboard shortcut table, and a pointer to `docs/superpowers/specs/2026-10-27-unison-prototype-design.md`.

- [ ] **Step 3: Walk the DESIGN.md §13 checklist in the browser**

Confirm each item and fix any miss: thread only in three places, no shadows/decorative gradients/entrance animations, accent only as fill with ink text, service code always present, keyboard-completable flows, reduced-motion handoff still legible, multi-script and RTL titles correct, every error has a cause and a next step, action names consistent across button/toast/error, readable at 360px and 200% zoom.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: add prototype README and verification notes"
```
