-- Unison — skema awal: akun provider (token di Vault), state OAuth, tabel publik milik user.
-- Diterapkan ke project Supabase `cliujpbiecvbskxiyxny` (unison, ap-southeast-1).

-- ============================================================
-- Schema non-publik untuk token & state OAuth
-- (tidak di-expose ke Data API; hanya diakses Edge Function via service role)
-- ============================================================
create schema if not exists private;

-- Akun layanan musik per pengguna. Token disimpan di Vault, dirujuk lewat token_secret_id.
create table if not exists private.provider_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  provider        text not null check (provider in ('spotify', 'apple', 'tidal', 'youtube', 'soundcloud')),
  token_secret_id uuid,            -- id secret di Supabase Vault (JSON: access_token, refresh_token)
  scope           text,
  expires_at      timestamptz,
  status          text not null default 'active'
                  check (status in ('active', 'needs-reconnect', 'disconnected')),
  connected_at    timestamptz not null default now(),
  unique (user_id, provider)
);

-- State OAuth PKCE, berumur pendek, disimpan server-side (anti CSRF).
create table if not exists private.oauth_states (
  id            uuid primary key default gen_random_uuid(),
  state         text not null unique,
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null,
  code_verifier text not null,
  redirect_uri  text not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists oauth_states_expires_at_idx on private.oauth_states (expires_at);

-- ============================================================
-- Tabel publik milik pengguna (RLS wajib)
-- ============================================================
create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.playlist_items (
  id                uuid primary key default gen_random_uuid(),
  playlist_id       uuid not null references public.playlists(id) on delete cascade,
  provider          text not null,
  provider_track_id text not null,
  title             text,
  artist            text,
  album             text,
  duration_ms       integer,
  position          integer not null default 0,
  created_at        timestamptz not null default now()
);

create table if not exists public.play_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  provider          text not null,
  provider_track_id text not null,
  title             text,
  artist            text,
  played_at         timestamptz not null default now(),
  duration_ms       integer
);

create table if not exists public.sync_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  provider   text not null,
  kind       text not null,
  cursor     text,
  status     text not null default 'pending',
  error      text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.play_history enable row level security;
alter table public.sync_jobs enable row level security;

-- Defense in depth: schema private tidak di-expose, tetap dikunci dari role lain.
alter table private.provider_accounts enable row level security;
alter table private.oauth_states enable row level security;

-- playlists: pemilik saja
create policy "playlists_owner_all" on public.playlists
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- playlist_items: lewat kepemilikan playlist induk
create policy "playlist_items_owner_all" on public.playlist_items
  for all to authenticated
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id and p.user_id = (select auth.uid())
  ));

-- play_history: pemilik saja
create policy "play_history_owner_all" on public.play_history
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- sync_jobs: pemilik saja
create policy "sync_jobs_owner_all" on public.sync_jobs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
