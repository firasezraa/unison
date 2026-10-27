// provider-status: status koneksi per provider untuk pengguna yang sedang login.
// Tidak mengembalikan token apa pun.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { isConfigured, PROVIDER_IDS } from '../_shared/providers.ts'

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
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')
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

  const { data: rows, error } = await admin.rpc('unison_provider_status', {
    p_user_id: userData.user.id,
  })
  if (error) {
    console.error('unison_provider_status gagal:', error.message)
    return json({ error: 'Gagal membaca status koneksi' }, 500)
  }

  const accounts = (rows ?? []) as Array<{ provider: string; status: string; connected_at: string | null }>
  const providers = PROVIDER_IDS.map((id) => {
    const account = accounts.find((item) => item.provider === id)
    return {
      id,
      configured: isConfigured(id, (name) => Deno.env.get(name)),
      status: account ? account.status : 'disconnected',
      connectedAt: account ? account.connected_at : null,
    }
  })

  return json({ providers })
})
