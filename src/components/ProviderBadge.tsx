import type { ProviderId } from '../domain/types'
import { PROVIDERS } from '../data/providers'

export function ProviderBadge({ provider, label }: { provider: ProviderId; label?: string }) {
  const meta = PROVIDERS[provider]
  return (
    <span className="badge" data-provider={provider} aria-label={`Sumber: ${meta.name}`} title={meta.name}>
      {label ?? meta.code}
    </span>
  )
}
