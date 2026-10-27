// Klien HTTP untuk Edge Function Unison (dipanggil dari browser dengan JWT user).
// Token provider TIDAK pernah dikembalikan ke sini — hanya status & URL otorisasi.

import type { ProviderAccount, ProviderId } from './types'

const FUNCTIONS_BASE = `${
  import.meta.env.VITE_SUPABASE_URL ?? 'https://cliujpbiecvbskxiyxny.supabase.co'
}/functions/v1`

export interface StartAuthResult {
  authorizationUrl?: string
  error?: string
  code?: string
}

async function post<T>(path: string, jwt: string, body?: unknown): Promise<T> {
  const response = await fetch(`${FUNCTIONS_BASE}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const message =
      typeof data.error === 'string' ? (data.error as string) : `Permintaan gagal (${response.status})`
    throw Object.assign(new Error(message), { status: response.status, code: data.code })
  }
  return data as T
}

export async function fetchProviderStatus(jwt: string): Promise<ProviderAccount[]> {
  const data = await post<{ providers: ProviderAccount[] }>('provider-status', jwt)
  return data.providers
}

export async function startProviderAuth(jwt: string, provider: ProviderId): Promise<StartAuthResult> {
  try {
    const data = await post<{ authorizationUrl: string }>('oauth-authorize', jwt, { provider })
    return { authorizationUrl: data.authorizationUrl }
  } catch (error) {
    const err = error as { message?: string; code?: string }
    return { error: err.message ?? 'Gagal memulai otorisasi', code: err.code }
  }
}

export async function disconnectProvider(jwt: string, provider: ProviderId): Promise<void> {
  await post('provider-disconnect', jwt, { provider })
}
