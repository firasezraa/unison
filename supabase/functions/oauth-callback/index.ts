// oauth-callback: dipanggil provider setelah otorisasi (?code&state).
// Tukar code di server (dengan client_secret + code_verifier), enkripsi token,
// simpan ke private.provider_accounts, lalu redirect ke aplikasi.
// verify_jwt harus FALSE: browser provider datang tanpa header Authorization;
// keamanan dijamin oleh state yang disimpan server-side (anti CSRF).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { encryptJson } from '../_shared/crypto.ts'
import { clientSecretEnv, isProviderId, providerSpec } from '../_shared/providers.ts'

function redirect(target: string): Response {
  return Response.redirect(target, 302)
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const appRedirect = Deno.env.get('APP_REDIRECT_URI') ?? 'https://unison.example/#/koneksi'

  const errorParam = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (errorParam) {
    return redirect(`${appRedirect}?status=denied&reason=${encodeURIComponent(errorParam)}`)
  }
  if (!code || !state) return redirect(`${appRedirect}?status=error`)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY')
  if (!supabaseUrl || !serviceRoleKey || !encryptionKey) {
    return redirect(`${appRedirect}?status=error&reason=not_configured`)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: rows, error: stateError } = await admin.rpc('unison_oauth_consume_state', {
    p_state: state,
  })
  const row = Array.isArray(rows) ? rows[0] : undefined
  if (stateError || !row || !isProviderId(row.provider)) {
    return redirect(`${appRedirect}?status=state_invalid`)
  }

  const provider = row.provider
  const spec = providerSpec(provider)
  const clientId = Deno.env.get(spec.clientIdEnv)
  const clientSecret = Deno.env.get(clientSecretEnv(provider))

  if (!clientId || !clientSecret || !spec.tokenUrl) {
    return redirect(`${appRedirect}?status=not_configured&provider=${provider}`)
  }

  const tokenResponse = await fetch(spec.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: row.redirect_uri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: row.code_verifier,
    }),
  })

  if (!tokenResponse.ok) {
    console.error('token exchange gagal:', tokenResponse.status)
    return redirect(`${appRedirect}?status=token_failed&provider=${provider}`)
  }

  const tokenJson: Record<string, unknown> = await tokenResponse.json()
  const expiresIn = typeof tokenJson.expires_in === 'number' ? tokenJson.expires_in : 3600
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const ciphertext = await encryptJson(encryptionKey, {
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token ?? null,
    token_type: tokenJson.token_type ?? 'Bearer',
  })

  const { error: upsertError } = await admin.rpc('unison_provider_upsert', {
    p_user_id: row.user_id,
    p_provider: provider,
    p_token_ciphertext: ciphertext,
    p_scope: (tokenJson.scope as string | undefined) ?? null,
    p_expires_at: expiresAt,
  })
  if (upsertError) {
    console.error('unison_provider_upsert gagal:', upsertError.message)
    return redirect(`${appRedirect}?status=storage_failed&provider=${provider}`)
  }

  return redirect(`${appRedirect}?status=connected&provider=${provider}`)
})
