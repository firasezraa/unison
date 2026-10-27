// provider-disconnect: putuskan layanan (hapus token) untuk pengguna yang login.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { isProviderId } from '../_shared/providers.ts'

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

  let body: { provider?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body JSON tidak valid' }, 400)
  }
  if (!isProviderId(body.provider)) return json({ error: 'Layanan tidak dikenal' }, 400)

  const { error } = await admin.rpc('unison_provider_disconnect', {
    p_user_id: userData.user.id,
    p_provider: body.provider,
  })
  if (error) {
    console.error('unison_provider_disconnect gagal:', error.message)
    return json({ error: 'Gagal memutuskan layanan' }, 500)
  }

  return json({ ok: true })
})
