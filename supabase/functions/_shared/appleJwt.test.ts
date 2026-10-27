import { describe, expect, it } from 'vitest'
import { base64UrlToBytes, createAppleDeveloperToken, derToRaw, signatureToRaw } from './appleJwt'

const encoder = new TextEncoder()
const ecdsa = { name: 'ECDSA', namedCurve: 'P-256' } as EcKeyGenParams
const signParams = { name: 'ECDSA', hash: 'SHA-256' } as EcdsaParams

function toPem(pkcs8: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(pkcs8)) binary += String.fromCharCode(byte)
  const lines = btoa(binary).match(/.{1,64}/g) ?? []
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`
}

/** Bangun DER ECDSA dari r||s, dengan padding 0x00 bila bit tinggi set. */
function rawToDerForTest(raw: Uint8Array): Uint8Array {
  const toInteger = (bytes: Uint8Array): Uint8Array => {
    let index = 0
    while (index < bytes.length - 1 && bytes[index] === 0) index++
    const value = bytes.subarray(index)
    if (value[0] & 0x80) {
      const padded = new Uint8Array(value.length + 1)
      padded.set(value, 1)
      return padded
    }
    return value
  }
  const r = toInteger(raw.subarray(0, 32))
  const s = toInteger(raw.subarray(32, 64))
  const body = new Uint8Array(4 + r.length + s.length)
  let cursor = 0
  body[cursor++] = 0x02
  body[cursor++] = r.length
  body.set(r, cursor)
  cursor += r.length
  body[cursor++] = 0x02
  body[cursor++] = s.length
  body.set(s, cursor)
  const der = new Uint8Array(2 + body.length)
  der[0] = 0x30
  der[1] = body.length
  der.set(body, 2)
  return der
}

describe('Apple developer token (ES256)', () => {
  it('menghasilkan JWT yang dapat diverifikasi dengan public key', async () => {
    const pair = await crypto.subtle.generateKey(ecdsa, true, ['sign', 'verify'])
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey)

    const token = await createAppleDeveloperToken({
      teamId: 'TEAM123456',
      keyId: 'KEY7890',
      privateKeyPem: toPem(pkcs8),
      now: 1_700_000_000,
      ttlSeconds: 1800,
    })

    const [header, payload, signature] = token.split('.')
    const decodedHeader = JSON.parse(new TextDecoder().decode(base64UrlToBytes(header)))
    const decodedPayload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)))

    expect(decodedHeader).toEqual({ alg: 'ES256', kid: 'KEY7890', typ: 'JWT' })
    expect(decodedPayload.iss).toBe('TEAM123456')
    expect(decodedPayload.iat).toBe(1_700_000_000)
    expect(decodedPayload.exp).toBe(1_700_001_800)

    const rawSignature = base64UrlToBytes(signature)
    expect(rawSignature.length).toBe(64)

    const verified = await crypto.subtle.verify(
      signParams,
      pair.publicKey,
      rawSignature,
      encoder.encode(`${header}.${payload}`),
    )
    expect(verified).toBe(true)
  })

  it('signature selalu 64 byte dan valid untuk banyak token', async () => {
    const pair = await crypto.subtle.generateKey(ecdsa, true, ['sign', 'verify'])
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey)

    for (let attempt = 0; attempt < 10; attempt++) {
      const token = await createAppleDeveloperToken({
        teamId: 'T',
        keyId: 'K',
        privateKeyPem: toPem(pkcs8),
        now: 1_700_000_000 + attempt,
      })
      const raw = base64UrlToBytes(token.split('.')[2])
      expect(raw.length).toBe(64)
      const verified = await crypto.subtle.verify(
        signParams,
        pair.publicKey,
        raw,
        encoder.encode(token.split('.').slice(0, 2).join('.')),
      )
      expect(verified).toBe(true)
    }
  })

  it('derToRaw menangani padding 0x00 pada komponen ber-bit-tinggi', () => {
    const raw = new Uint8Array(64)
    raw[0] = 0x80 // r bit tinggi -> DER menambah 0x00
    raw[31] = 0x01
    raw[32] = 0x7f
    raw[63] = 0xff
    const roundTrip = derToRaw(rawToDerForTest(raw))
    expect(Array.from(roundTrip)).toEqual(Array.from(raw))
  })

  it('signatureToRaw menerima raw maupun DER', () => {
    const raw = new Uint8Array(64).fill(7)
    expect(signatureToRaw(raw).length).toBe(64)
    expect(Array.from(signatureToRaw(rawToDerForTest(raw)))).toEqual(Array.from(raw))
  })
})
