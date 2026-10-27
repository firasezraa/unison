// oauth-authorize: memulai alur OAuth 2.1 PKCE untuk satu provider.
// Menerima POST { provider }; menghasilkan state + code_verifier server-side,
// menyimpannya ke private.oauth_states, lalu mengembalikan URL otorisasi.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildAuthorizeUrl, generatePkce, randomString } from '../_shared/oauth.ts'
import { isConfigured, isProviderId, providerSpec } from '../_shared/providers.ts'

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
  const redirectUri = Deno.env.get('OAUTH_REDIRECT_URI')
  if (!supabaseUrl || !serviceRoleKey || !redirectUri) {
    return json({ error: 'Edge Function belum dikonfigurasi', code: 'NOT_CONFIGURED' }, 503)
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
  const provider = body.provider

  if (!isConfigured(provider, (name) => Deno.env.get(name))) {
    return json(
      { error: `Layanan ${provider} belum dikonfigurasi`, code: 'PROVIDER_NOT_CONFIGURED' },
      403,
    )
  }

  const spec = providerSpec(provider)
  const clientId = Deno.env.get(spec.clientIdEnv)
  const { codeVerifier, codeChallenge } = await generatePkce()
  const state = randomString(32)

  const { error: insertError } = await admin.rpc('unison_oauth_insert_state', {
    p_state: state,
    p_user_id: userData.user.id,
    p_provider: provider,
    p_code_verifier: codeVerifier,
    p_redirect_uri: redirectUri,
  })
  if (insertError) {
    console.error('unison_oauth_insert_state gagal:', insertError.message)
    return json({ error: 'Gagal menyimpan status OAuth' }, 500)
  }

  const authorizationUrl = buildAuthorizeUrl(spec.authorizeUrl, {
    clientId: clientId ?? '',
    redirectUri,
    state,
    codeChallenge,
    scopes: spec.scopes,
  })

  return json({ authorizationUrl, state })
})
