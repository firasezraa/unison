import { describe, expect, it } from 'vitest'
import { base64UrlEncode, buildAuthorizeUrl, generatePkce, sha256Base64Url } from './oauth'
import { isConfigured, isProviderId, providerSpec, PROVIDER_IDS } from './providers'
import { decryptJson, encryptJson } from './crypto'

describe('PKCE (RFC 7636)', () => {
  it('menghasilkan verifier 43–128 karakter dan challenge base64url', async () => {
    const { codeVerifier, codeChallenge } = await generatePkce()
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43)
    expect(codeVerifier.length).toBeLessThanOrEqual(128)
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(codeChallenge).not.toContain('=')
  })

  it('challenge sama dengan base64url(SHA-256(verifier))', async () => {
    const { codeVerifier, codeChallenge } = await generatePkce()
    expect(codeChallenge).toBe(await sha256Base64Url(codeVerifier))
  })

  it('base64url tidak memuat karakter +, /, atau =', () => {
    const encoded = base64UrlEncode(new Uint8Array([251, 255, 254, 253]))
    expect(encoded).not.toMatch(/[+/=]/)
  })
})

describe('buildAuthorizeUrl', () => {
  it('memuat parameter OAuth 2.1 PKCE yang benar', () => {
    const url = buildAuthorizeUrl('https://accounts.spotify.com/authorize', {
      clientId: 'client-123',
      redirectUri: 'https://app.example/callback',
      state: 'state-abc',
      codeChallenge: 'challenge-xyz',
      scopes: ['user-read-private'],
    })
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('client-123')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBe('challenge-xyz')
    expect(parsed.searchParams.get('state')).toBe('state-abc')
    expect(parsed.searchParams.get('scope')).toBe('user-read-private')
  })

  it('mengabaikan scope bila kosong (mis. Apple Music)', () => {
    const url = buildAuthorizeUrl('https://appleid.apple.com/auth/authorize', {
      clientId: 'apple-client',
      redirectUri: 'https://app.example/callback',
      state: 's',
      codeChallenge: 'c',
      scopes: [],
    })
    expect(new URL(url).searchParams.has('scope')).toBe(false)
  })
})

describe('provider registry', () => {
  it('memvalidasi whitelist provider', () => {
    expect(isProviderId('spotify')).toBe(true)
    expect(isProviderId('deezer')).toBe(false)
    expect(isProviderId(123)).toBe(false)
  })

  it('provider tanpa Client ID dianggap belum dikonfigurasi', () => {
    const env = (name: string) => (name === 'SPOTIFY_CLIENT_ID' ? 'abc' : undefined)
    expect(isConfigured('spotify', env)).toBe(true)
    expect(isConfigured('apple', env)).toBe(false)
    expect(isConfigured('tidal', env)).toBe(false)
  })

  it('setiap provider punya spesifikasi dan clientIdEnv', () => {
    for (const id of PROVIDER_IDS) {
      const spec = providerSpec(id)
      expect(spec.clientIdEnv).toMatch(/CLIENT_ID$/)
    }
  })
})

describe('token encryption (AES-GCM)', () => {
  const KEY = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))

  it('round-trip access+refresh token', async () => {
    const token = { access_token: 'at-secret', refresh_token: 'rt-secret', scope: 'a b' }
    const stored = await encryptJson(KEY, token)
    expect(stored).not.toContain('at-secret')
    expect(await decryptJson(KEY, stored)).toEqual(token)
  })

  it('ciphertext berbeda setiap kali (IV acak)', async () => {
    const token = { access_token: 'x' }
    const a = await encryptJson(KEY, token)
    const b = await encryptJson(KEY, token)
    expect(a).not.toBe(b)
  })
})
