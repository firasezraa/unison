// Apple Music developer token (MusicKit), JWT ES256.
// Kunci privat (.p8, PKCS#8 PEM) hanya ada di Edge Function secret — tidak pernah ke klien.
// Catatan: WebCrypto (Deno & Node) mengembalikan signature ECDSA sebagai raw r||s (64 byte),
// bukan DER. Versi lama Node mengembalikan DER, jadi kedua bentuk tetap ditangani.

const encoder = new TextEncoder()

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function jsonSegment(value: unknown): string {
  return base64Url(encoder.encode(JSON.stringify(value)))
}

/** Ubah PEM PKCS#8 menjadi DER bytes. */
export function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  if (!body) throw new Error('PEM kosong')
  return base64UrlToBytes(body.replace(/\+/g, '-').replace(/\//g, '_'))
}

/** DER ECDSA signature -> raw r||s (32 + 32 byte). Dipakai hanya untuk runtime yang masih DER. */
export function derToRaw(der: Uint8Array): Uint8Array<ArrayBuffer> {
  if (der[0] !== 0x30) throw new Error('DER: SEQUENCE tidak ditemukan')
  let offset = 2
  const sequenceLength = der[1]
  if (sequenceLength & 0x80) offset = 2 + (sequenceLength & 0x7f)

  const readInteger = (position: number): { bytes: Uint8Array; next: number } => {
    if (der[position] !== 0x02) throw new Error('DER: INTEGER tidak ditemukan')
    const length = der[position + 1]
    const start = position + 2
    return { bytes: der.subarray(start, start + length), next: start + length }
  }

  const stripLeadingZeros = (bytes: Uint8Array): Uint8Array => {
    let index = 0
    while (index < bytes.length - 1 && bytes[index] === 0) index++
    return bytes.subarray(index)
  }

  const r = readInteger(offset)
  const s = readInteger(r.next)
  const rBytes = stripLeadingZeros(r.bytes)
  const sBytes = stripLeadingZeros(s.bytes)
  if (rBytes.length > 32 || sBytes.length > 32) throw new Error('DER: komponen melebihi 32 byte')

  const out = new Uint8Array(64)
  out.set(rBytes, 32 - rBytes.length)
  out.set(sBytes, 64 - sBytes.length)
  return out
}

/** Terima raw (64 byte) atau DER; kembalikan raw ber-backing ArrayBuffer. */
export function signatureToRaw(signature: Uint8Array): Uint8Array<ArrayBuffer> {
  if (signature.length === 64) {
    const copy = new Uint8Array(64)
    copy.set(signature)
    return copy
  }
  if (signature[0] === 0x30) return derToRaw(signature)
  throw new Error('format signature ECDSA tidak dikenal')
}

export interface AppleTokenOptions {
  teamId: string
  keyId: string
  privateKeyPem: string
  /** detik sejak epoch; default sekarang */
  now?: number
  /** masa berlaku, default 30 menit (batas Apple: 6 bulan) */
  ttlSeconds?: number
}

export async function createAppleDeveloperToken(options: AppleTokenOptions): Promise<string> {
  const issuedAt = options.now ?? Math.floor(Date.now() / 1000)
  const ttl = options.ttlSeconds ?? 1800
  const header = { alg: 'ES256', kid: options.keyId, typ: 'JWT' }
  const payload = { iss: options.teamId, iat: issuedAt, exp: issuedAt + ttl }

  const signingInput = `${jsonSegment(header)}.${jsonSegment(payload)}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(options.privateKeyPem),
    { name: 'ECDSA', namedCurve: 'P-256' } as EcKeyImportParams,
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' } as EcdsaParams,
    key,
    encoder.encode(signingInput),
  )
  return `${signingInput}.${base64Url(signatureToRaw(new Uint8Array(signature)))}`
}
