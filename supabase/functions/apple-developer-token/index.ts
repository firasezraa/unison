// apple-developer-token: terbitkan developer token MusicKit (JWT ES256) berumur pendek.
// Kunci privat Apple (.p8) hanya ada di Edge Function secret.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { createAppleDeveloperToken } from '../_shared/appleJwt.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Metode tidak didukung' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Edge Function belum dikonfigurasi' }, 503)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!jwt) return json({ error: 'Tidak terautentikasi' }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData.user) return json({ error: 'Sesi tidak valid' }, 401)

  const teamId = Deno.env.get('APPLE_MUSIC_TEAM_ID')
  const keyId = Deno.env.get('APPLE_MUSIC_KEY_ID')
  const privateKey = Deno.env.get('APPLE_MUSIC_PRIVATE_KEY')

  if (!teamId || !keyId || !privateKey) {
    return json(
      {
        error:
          'Apple Music belum dikonfigurasi. Tambahkan APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, dan APPLE_MUSIC_PRIVATE_KEY sebagai secret Edge Function.',
        code: 'APPLE_NOT_CONFIGURED',
      },
      503,
    )
  }

  const ttlSeconds = 1800
  const developerToken = await createAppleDeveloperToken({
    teamId,
    keyId,
    privateKeyPem: privateKey,
    ttlSeconds,
  })

  return json({ developerToken, expiresIn: ttlSeconds })
})
