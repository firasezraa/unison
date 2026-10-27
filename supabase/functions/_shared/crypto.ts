// Shared: enkripsi token di lapisan aplikasi (AES-256-GCM).
// Kunci hanya ada di Edge Function secret (TOKEN_ENCRYPTION_KEY), tidak pernah ke klien.
// Ciphertext disimpan di private.provider_accounts.token_ciphertext.

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** Salin string UTF-8 ke Uint8Array ber-backing ArrayBuffer (BufferSource). */
function encodeUtf8(text: string): Uint8Array<ArrayBuffer> {
  const bytes = textEncoder.encode(text)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function importKey(keyB64Url: string): Promise<CryptoKey> {
  const raw = base64UrlToBytes(keyB64Url)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/** Format tersimpan: `${ivBase64Url}.${ciphertextBase64Url}` */
export async function encryptJson(keyB64Url: string, payload: unknown): Promise<string> {
  const key = await importKey(keyB64Url)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodeUtf8(JSON.stringify(payload)))
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`
}

export async function decryptJson<T>(keyB64Url: string, stored: string): Promise<T> {
  const separator = stored.indexOf('.')
  if (separator < 0) throw new Error('format ciphertext tidak valid')
  const iv = base64UrlToBytes(stored.slice(0, separator))
  const ciphertext = base64UrlToBytes(stored.slice(separator + 1))
  const key = await importKey(keyB64Url)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(textDecoder.decode(plaintext)) as T
}
