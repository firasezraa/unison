import type { ProviderId } from '../domain/types'

/** Benang layanan: hanya dipakai di baris lagu, bilah progres, dan handoff. */
export function ThreadBar({ provider, active = false }: { provider: ProviderId; active?: boolean }) {
  return (
    <span
      className={active ? 'thread thread--active' : 'thread'}
      data-provider={provider}
      aria-hidden="true"
    />
  )
}
