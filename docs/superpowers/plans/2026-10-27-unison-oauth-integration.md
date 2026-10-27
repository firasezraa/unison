# Unison — Integrasi OAuth, Token, dan Adapter Provider (Fase Arsitektur)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun fondasi produksi untuk OAuth 2.1 PKCE, penyimpanan token terenkripsi, dan adapter `MusicProvider` di project Supabase `unison` — tanpa playback nyata dan tanpa kredensial berbayar.

**Architecture:** Supabase (Postgres + RLS + Vault + Edge Functions) di sisi server; modul TypeScript murni untuk logika OAuth/PKCE yang diuji Vitest; frontend memakai publishable key saja, token tak pernah sampai ke klien.

**Tech Stack:** Supabase cloud (ref `cliujpbiecvbskxiyxny`, region ap-southeast-1), Deno Edge Functions, Vitest, supabase-js (klien), Web Crypto API.

**Spec:** `IDEA.md` §7–9 (arsitektur, kontrak adapter, keamanan) · `PRD.md` §11–13 (keamanan, model data) · `docs/superpowers/specs/2026-10-27-unison-prototype-design.md`

## Global Constraints

- Token layanan musik **tidak pernah** dikirim ke klien; disimpan terenkripsi di Supabase Vault, dirujuk dari `private.provider_accounts.token_secret_id`.
- Semua tabel `public` memakai RLS dengan policy `TO authenticated` + predikat `(select auth.uid()) = user_id`.
- OAuth 2.1 **PKCE** (S256); `state` diverifikasi; `code_verifier` disimpan server-side di `private.oauth_states` (kedaluwarsa 10 menit), bukan di klien.
- Scope seminimal mungkin per provider; capability flags jujur (provider tanpa kredensial tampil `belum dikonfigurasi`).
- Rahasia (client secret, private key Apple) hanya di Edge Function secrets (`Deno.env`); tidak di git, tidak di klien.
- Tidak ada secret yang di-hardcode; tidak ada `service_role` key di klien.
- Seluruh copy UI tetap Bahasa Indonesia; error memuat penyebab + langkah berikutnya.
- Logika inti (PKCE, registry provider, capability) berupa modul TS murni portabel ke Deno dan Node (Vitest), tanpa import khusus Deno.

## Review Focus

- Token exchange hanya boleh terjadi di server; `code_verifier` dan `client_secret` harus tidak bisa diakses klien.
- `state` yang tidak cocok atau kedaluwarsa harus ditolak sebelum token ditukar (anti CSRF).
- Kolom `provider` divalidasi whitelist; input bebas tidak boleh masuk ke query tanpa parameterisasi.
- Token lama harus diganti (upsert), bukan menduplikasi baris per (user, provider).
- Provider yang tidak punya kredensial harus menghasilkan respons yang jelas (503/`belum dikonfigurasi`), bukan crash atau 500 kosong.
- Client publishable key boleh bocor (memang publik), tetapi `service_role` tidak boleh pernah muncul di bundle frontend.

---

### Task 1: Skema, RLS, dan Vault

**Files:** `supabase/migrations/0001_init.sql` (artefak git; diterapkan via `execute_sql`)

- [ ] **Step 1:** Buat `private.provider_accounts`, `private.oauth_states`, dan tabel publik `playlists`, `playlist_items`, `play_history`, `sync_jobs` (kolom sesuai IDEA §7.3; `provider` dengan `check` whitelist; `unique(user_id, provider)`).
- [ ] **Step 2:** Aktifkan RLS di semua tabel publik + policy owner `TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK (...)`; `playlist_items` lewat join ke `playlists.user_id`.
- [ ] **Step 3:** Jalankan via `execute_sql` pada `cliujpbiecvbskxiyxny`; verifikasi dengan `list_tables` dan `get_advisors`.

### Task 2: Modul OAuth/PKCE murni + registry provider

**Files:** `supabase/functions/_shared/oauth.ts`, `supabase/functions/_shared/providers.ts`, `supabase/functions/_shared/oauth.test.ts`

- [ ] **Step 1:** `generatePkce()` → `{ codeVerifier, codeChallenge }` (S256, Web Crypto).
- [ ] **Step 2:** `buildAuthorizeUrl(provider, { codeChallenge, state, redirectUri })` untuk `spotify` dan `apple` (param per provider; scope minimal).
- [ ] **Step 3:** `PROVIDER_REGISTRY` dengan `tokenEndpoint`, `authorizeUrl`, `scopes`, `configured` (dari env), `capabilities` (jujur).
- [ ] **Step 4:** Unit test PKCE (verifier 43–128 char, challenge = base64url(SHA256(verifier))), URL (scope, redirect_uri, response_type=code, code_challenge_method=S256), dan registry (provider tak dikenal ditolak).

### Task 3: Edge Functions

**Files:** `supabase/functions/oauth-authorize/index.ts`, `supabase/functions/oauth-callback/index.ts`, `supabase/functions/provider-status/index.ts`, `supabase/functions/apple-developer-token/index.ts`

- [ ] **Step 1:** `oauth-authorize` — auth user, `POST {provider}` → validasi, generate PKCE, simpan `state`+`verifier` ke `private.oauth_states`, balas `{ authorizationUrl }` (403 bila provider belum dikonfigurasi).
- [ ] **Step 2:** `oauth-callback` — `GET ?code&state` → cocokkan state, tukar code di `tokenEndpoint` (server-side, dengan client_secret), simpan access+refresh ke Vault (`vault.create_secret`), upsert `provider_accounts`, redirect `/#/koneksi?status=...`.
- [ ] **Step 3:** `provider-status` — auth user, kembalikan status koneksi per provider (tanpa token).
- [ ] **Step 4:** `apple-developer-token` — terbitkan MusicKit JWT berumur pendek; 503 bila `APPLE_MUSIC_PRIVATE_KEY` belum diisi.
- [ ] **Step 5:** Deploy via `deploy_edge_function`; verifikasi `list_edge_functions` + curl `provider-status` dan `apple-developer-token` (harus 503 jujur).

### Task 4: Klien frontend + `.env.example` + dokumentasi

**Files:** `src/integration/types.ts`, `src/integration/providers.ts`, `src/integration/supabase.ts`, `src/integration/oauth.ts`, `.env.example`, pembaruan `README.md`

- [ ] **Step 1:** `types.ts` — `MusicProvider`, `Capabilities`, `ProviderAccount`, `ProviderTrack` (sesuai IDEA §7.2).
- [ ] **Step 2:** `supabase.ts` — klien `createClient` dengan `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (publishable).
- [ ] **Step 3:** `providers.ts` + `oauth.ts` — registry & fungsi `startOAuth`, `parseCallback` untuk dipakai Fase 0.
- [ ] **Step 4:** `.env.example` (URL, publishable key, client id/secret per provider, redirect URI) tanpa nilai rahasia; perbarui README bagian integrasi.

### Task 5: Verifikasi menyeluruh

- [ ] `npx vitest run` (modul OAuth) + `npm run build` + `npm run lint`.
- [ ] Konfirmasi tak ada secret/service_role di bundle (`grep` hasil build).
- [ ] `get_advisors` bersih; `list_tables` menampilkan tabel baru.
