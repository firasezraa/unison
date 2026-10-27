-- Unison — fungsi pembungkus service-role-only untuk akses schema private dari Edge Function.
-- PostgREST hanya mengekspos schema public; Edge Function memanggil fungsi ini lewat rpc
-- dengan service role. Fungsi SECURITY DEFINER + REVOKE dari PUBLIC membuatnya hanya bisa
-- dipanggil service_role, bukan anon/authenticated.

alter table private.provider_accounts
  add column if not exists token_ciphertext text;

-- Simpan state OAuth PKCE (dipanggil oauth-authorize).
create or replace function unison_oauth_insert_state(
  p_state text,
  p_user_id uuid,
  p_provider text,
  p_code_verifier text,
  p_redirect_uri text
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.oauth_states (state, user_id, provider, code_verifier, redirect_uri)
  values (p_state, p_user_id, p_provider, p_code_verifier, p_redirect_uri);
$$;

-- Ambil + hapus state (sekali pakai) untuk callback.
create or replace function unison_oauth_consume_state(p_state text)
returns table (user_id uuid, provider text, code_verifier text, redirect_uri text)
language sql
security definer
set search_path = ''
as $$
  delete from private.oauth_states
  where state = p_state and expires_at > now()
  returning user_id, provider, code_verifier, redirect_uri;
$$;

-- Simpan/ganti token terenkripsi per (user, provider).
create or replace function unison_provider_upsert(
  p_user_id uuid,
  p_provider text,
  p_token_ciphertext text,
  p_scope text,
  p_expires_at timestamptz
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.provider_accounts (user_id, provider, token_ciphertext, scope, expires_at, status)
  values (p_user_id, p_provider, p_token_ciphertext, p_scope, p_expires_at, 'active')
  on conflict (user_id, provider)
  do update set
    token_ciphertext = excluded.token_ciphertext,
    scope = excluded.scope,
    expires_at = excluded.expires_at,
    status = 'active',
    connected_at = now();
$$;

-- Baca status koneksi tanpa membocorkan token.
create or replace function unison_provider_status(p_user_id uuid)
returns table (provider text, status text, connected_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select provider, status, connected_at
  from private.provider_accounts
  where user_id = p_user_id;
$$;

-- Hapus token saat putuskan layanan.
create or replace function unison_provider_disconnect(p_user_id uuid, p_provider text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.provider_accounts
  where user_id = p_user_id and provider = p_provider;
$$;

-- Hanya service_role yang boleh memanggil.
revoke execute on function unison_oauth_insert_state(text, uuid, text, text, text) from public, anon, authenticated;
revoke execute on function unison_oauth_consume_state(text) from public, anon, authenticated;
revoke execute on function unison_provider_upsert(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function unison_provider_status(uuid) from public, anon, authenticated;
revoke execute on function unison_provider_disconnect(uuid, text) from public, anon, authenticated;

grant execute on function unison_oauth_insert_state(text, uuid, text, text, text) to service_role;
grant execute on function unison_oauth_consume_state(text) to service_role;
grant execute on function unison_provider_upsert(uuid, text, text, text, timestamptz) to service_role;
grant execute on function unison_provider_status(uuid) to service_role;
grant execute on function unison_provider_disconnect(uuid, text) to service_role;
