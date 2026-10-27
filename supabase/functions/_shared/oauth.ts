// Shared: PKCE (RFC 7636) + pembangun URL OAuth.
// Framework-agnostic — dipakai Edge Function (Deno) dan diuji Vitest (Node).
// Bergantung hanya pada Web Crypto API (tersedia di Deno & Node 18+).

export function base64UrlEncode(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomString(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes).slice(0, length)
}

export async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return base64UrlEncode(digest)
}

export interface PkcePair {
  codeVerifier: string
  codeChallenge: string
}

/** Verifier 43–128 karakter, challenge = base64url(SHA-256(verifier)). */
export async function generatePkce(): Promise<PkcePair> {
  const codeVerifier = randomString(64)
  const codeChallenge = await sha256Base64Url(codeVerifier)
  return { codeVerifier, codeChallenge }
}

export interface AuthorizeParams {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  scopes: string[]
}

export function buildAuthorizeUrl(authorizeUrl: string, params: AuthorizeParams): string {
  const search = new URLSearchParams({
    client_id: params.clientId,
    response_type: 'code',
    redirect_uri: params.redirectUri,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  })
  if (params.scopes.length > 0) search.set('scope', params.scopes.join(' '))
  return `${authorizeUrl}?${search.toString()}`
}
