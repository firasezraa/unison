# Unison — pemutar musik lintas layanan

Unison menyatukan beberapa langganan streaming (Spotify, Apple Music, TIDAL, YouTube, SoundCloud) ke dalam **satu pencarian, satu antrean, dan satu pemutar**. Repo ini berisi dua lapisan:

1. **Prototipe UI** (React + Vite + TypeScript) — memvalidasi UX pencarian lintas layanan, antrean campuran, dan momen pindah layanan (*handoff*).
2. **Backend Supabase** — autentikasi pengguna, alur OAuth 2.1 PKCE, dan penyimpanan token terenkripsi untuk layanan musik.

Dibangun dari `IDEA.md`, `PRD.md`, dan `DESIGN.md`.

## Status: yang nyata vs yang disimulasikan

| Fitur | Status |
|---|---|
| Pemutaran audio | ⚠️ **Disimulasikan** (timer dipercepat, tanpa suara nyata) |
| Sign-up / sign-in | ✅ Nyata — Supabase Auth (email + kata sandi, tautan ajaib) |
| Hubungkan / putuskan layanan | ✅ Nyata — OAuth 2.1 PKCE + token terenkripsi di server |
| Pencarian, antrean, playlist | ⚠️ Data contoh (mock) di `src/data/` |
| Playback provider (MusicKit JS / Web Playback SDK) | ⏳ Belum — menunggu kredensial berbayar |

---

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # 58 unit test (Vitest)
npm run build    # tsc + vite build
npm run lint     # oxlint
```

Frontend memakai Supabase **publishable key** yang sudah di-hardcode sebagai fallback (`src/integration/supabase.ts`) — nilai publik, aman. Bila ingin mengubah, salin `.env.example` ke `.env` dan isi `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Rute

| Rute | Isi |
|---|---|
| `#/` | Beranda: lanjutkan mendengar, playlist terbaru, status layanan |
| `#/cari` | Pencarian terpadu per layanan |
| `#/library` | Library: Lagu, Album, Artis, Playlist + filter layanan |
| `#/playlist/:id` | Detail playlist campuran |
| `#/koneksi` | Koneksi layanan (butuh login) |
| `#/pengaturan` | Tema, bahasa, prioritas layanan, privasi & data |
| `#/masuk` | Masuk / buat akun |

## Demo cepat (tanpa login)

Bagian prototipe tetap bisa dicoba tanpa akun:

- **Pencarian lintas layanan** — ketik `hujan`. Apple Music muncul lebih dulu, lalu Spotify dan SoundCloud menyusul di bawah tanpa membuat daftar melompat; TIDAL paling lambat.
- **Layanan yang gagal** — ketik `xhujan`: TIDAL menampilkan "Hasil dari TIDAL belum tersedia." dengan tombol Coba lagi, sementara hasil lain tetap tampil. (Huruf `x` di awal adalah pemicu galat khusus demo, tidak ikut dicari.)
- **Antrean campuran** — putar lagu dari satu layanan, "Tambah ke antrean" lagu dari layanan lain, ubah urutan dengan tombol naik/turun.
- **Handoff** — biarkan lagu selesai atau lompati dengan tombol berikutnya. Bilah progres berganti benang dari warna layanan lama ke baru, dengan teks "Memuat dari …".
- **Handoff gagal** — aktifkan "Paksa gagal saat pindah layanan" di panel Antrean. Setelah 8 detik lagu dilewati dengan alasan jelas, dan lagu itu tetap terlihat di bagian **Dilewati**.
- **Tema** — Terang, Gelap, atau Ikuti sistem (tersimpan di `localStorage`).

## Pintasan keyboard

| Tombol | Aksi |
|---|---|
| `Spasi` | Putar / jeda |
| `←` / `→` | Mundur / maju 5 detik |
| `Shift` + `←` / `→` | Lagu sebelumnya / berikutnya |
| `↑` / `↓` | Volume |
| `/` | Fokus ke pencarian |
| `Q` | Buka / tutup antrean |
| `?` | Daftar pintasan |

---

## Integrasi Supabase

### Alur OAuth 2.1 PKCE

```
1. Pengguna masuk (#/masuk) → sesi Supabase Auth (JWT)
2. Di #/koneksi, klik "Hubungkan" → POST /functions/v1/oauth-authorize {provider}
   → server buat state + code_verifier, simpan ke private.oauth_states (10 menit)
   → balas authorizationUrl → browser diarahkan ke provider
3. Provider → redirect ke /functions/v1/oauth-callback?code&state
   → server cocokkan state (sekali pakai), tukar code (client_secret + code_verifier)
   → enkripsi token (AES-256-GCM), simpan ke private.provider_accounts
   → redirect balik ke #/koneksi?status=connected&provider=…
4. "Putuskan" → POST /functions/v1/provider-disconnect → token dihapus
```

`code_verifier` dan `client_secret` **tidak pernah** menyentuh klien; `state` mencegah CSRF.

### Struktur

| Komponen | Lokasi | Fungsi |
|---|---|---|
| Skema + RLS | `supabase/migrations/0001_init.sql` | Tabel `private.*` (token, state OAuth) dan `public.*` (playlist, riwayat, sync) dengan RLS owner `auth.uid()` |
| Fungsi service-role-only | `supabase/migrations/0002_private_access_functions.sql` | 5 fungsi pembungkus agar Edge Function bisa akses schema `private` |
| Modul murni (teruji) | `supabase/functions/_shared/` | PKCE, enkripsi AES-GCM, JWT ES256 Apple, registry provider |
| Edge Functions | `supabase/functions/*/` | 5 fungsi HTTP |
| Klien frontend | `src/integration/`, `src/auth/` | Klien Supabase + helper pemanggil Edge Function + AuthContext |

### Edge Functions

| Fungsi | Method | Auth | Tugas |
|---|---|---|---|
| `oauth-authorize` | POST | JWT user | Buat state+PKCE, balas URL otorisasi |
| `oauth-callback` | GET | `state` | Tukar code, enkripsi & simpan token, redirect |
| `provider-status` | POST | JWT user | Status koneksi per provider (tanpa token) |
| `provider-disconnect` | POST | JWT user | Hapus token (putuskan layanan) |
| `apple-developer-token` | POST | JWT user | Terbitkan developer token MusicKit (ES256) |

### Model keamanan

- Token provider dienkripsi **AES-256-GCM**; kuncinya hanya di secret Edge Function (`TOKEN_ENCRYPTION_KEY`). Ciphertext di `private.provider_accounts.token_ciphertext`, **tidak pernah** dikirim ke klien.
- Semua tabel `public` memakai **RLS** policy owner `TO authenticated USING ((select auth.uid()) = user_id)`.
- Fungsi pembungkus `unison_*` hanya bisa dipanggil `service_role` (terverifikasi `anon_exec=false, auth_exec=false, svc_exec=true`).
- Kunci publishable boleh di klien; `service_role` **tidak pernah** masuk bundle frontend.

---

## Mengaktifkan integrasi (panduan langkah demi langkah)

Ini perlu dikerjakan **sekali** di Dashboard Supabase (atau lewat CLI `supabase secrets set`). Tanpa langkah ini, tombol "Hubungkan" akan menampilkan "Layanan belum dikonfigurasi" secara jujur.

### Langkah 1 — Matikan "Confirm email" (disarankan untuk dev)

Bila tidak dimatikan, daftar akun baru mengirim email konfirmasi (terkena batas gratis 4 email/jam) dan sesi belum terbentuk sampai email diklik.

**Dashboard → Authentication → Sign In / Up → Email → matikan "Confirm email".**

### Langkah 2 — Set secret Edge Function

**Dashboard → Edge Functions → Secrets**, atau `supabase secrets set NAMA="nilai"`. Daftar secret yang dibutuhkan:

| Secret | Wajib | Keterangan |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key project (hanya di sisi server) |
| `TOKEN_ENCRYPTION_KEY` | ✅ | Kunci AES-256-GCM, 32 byte base64url |
| `OAUTH_REDIRECT_URI` | ✅ | URL callback |
| `APP_REDIRECT_URI` | ✅ | Origin aplikasi + `/#/koneksi`, mis. `http://localhost:5173/#/koneksi` |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | bila pakai Spotify | Dari Spotify Developer Dashboard |
| `APPLE_MUSIC_CLIENT_ID` / `APPLE_MUSIC_CLIENT_SECRET` | bila pakai Apple | Dari Apple Developer |
| `APPLE_MUSIC_TEAM_ID` / `APPLE_MUSIC_KEY_ID` / `APPLE_MUSIC_PRIVATE_KEY` | bila pakai Apple | Untuk developer token MusicKit (isi file `.p8`) |
| `TIDAL_CLIENT_ID` / `YOUTUBE_CLIENT_ID` / `SOUNDCLOUD_CLIENT_ID` (+`_SECRET`) | bila pakai layanan itu | Sesuai konsol developer masing-masing |

Generate `TOKEN_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### Langkah 3 — Isi kredensial provider

- **Spotify**: buat app di [Spotify for Developers](https://developer.spotify.com/dashboard) → dapatkan Client ID & Secret. Web Playback SDK butuh akun Premium (lihat catatan batas di bawah).
- **Apple Music**: Apple Developer Program → buat MusicKit ID & key `.p8` → dapatkan Team ID, Key ID, Client ID/Secret.
- **YouTube**: [Google Cloud Console](https://console.cloud.google.com) → OAuth Client.
- **SoundCloud**: daftar app di SoundCloud Developers (menunggu approval).

### Langkah 4 — Daftarkan redirect URI di konsol provider

Tambahkan nilai `OAUTH_REDIRECT_URI` (Langkah 2) ke daftar **Redirect URIs** yang diizinkan di dashboard tiap provider, supaya callback tidak ditolak.

### Langkah 5 — Jalankan & uji

```bash
npm run dev   # http://localhost:5173
```

1. Buka `#/masuk` → daftar/masuk.
2. Buka `#/koneksi` → klik **Hubungkan** pada layanan yang sudah dikonfigurasi.
3. Ikuti halaman otorisasi provider, kembali ke `#/koneksi?status=connected`.

### Batasan jujur (per provider)

| Layanan | Playback web | Syarat |
|---|---|---|
| Apple Music | ✅ MusicKit JS | Apple Developer Program ($99/tahun) + langganan pengguna |
| Spotify | ✅ Web Playback SDK | Premium (pemilik app & pengguna); Dev Mode ≤ 5 pengguna |
| TIDAL | ⚠️ perlu verifikasi | Langganan pengguna |
| YouTube | ⚠️ video, player wajib tampil | Tanpa langganan |
| SoundCloud | ✅ widget | Tanpa langganan; perlu approval app |

> Tanpa akun berbayar, **playback nyata Apple Music / Spotify tidak mungkin**. Fondasi OAuth + token di repo ini sudah jadi dan teruji; yang tersisa untuk Fase 0 adalah mengisi kredensial satu provider dan memuat SDK di klien.

### Catatan teknis

- **Import `_shared`**: file sumber di repo memakai `../_shared/*` (konvensi `supabase functions deploy` CLI), sedangkan deploy lewat MCP memakai `./_shared/*`. Isi modul identik, hanya jalur import yang berbeda.
- **Sesi di `localStorage`**: standar `supabase-js` untuk SPA. Alternatif lebih ketat (cookie httpOnly) butuh SSR (`@supabase/ssr`) — pertimbangan menjelang produksi.

---

## Catatan implementasi

- **Stack**: Vite, React, TypeScript, Vitest, `@supabase/supabase-js`. CSS murni dengan custom property dari `DESIGN.md`; tanpa kerangka CSS, tanpa bayangan.
- **Font**: Poppins 400/500/700, self-host via `@fontsource/poppins`.
- **Logika murni teruji**: `src/state/queue.ts`, `handoff.ts`, `search.ts`, `playback.ts`, plus `supabase/functions/_shared/` (PKCE, AES-GCM, JWT Apple, registry).
- **Aksesibilitas**: landmark & heading, `role="slider"` + `aria-valuetext`, `aria-live="polite"`, fokus terlihat, target sentuh ≥ 44px, `dir="auto"`, dukungan `prefers-reduced-motion` dan `forced-colors`, kode huruf layanan selalu menyertai warna.

## Dokumen

- `docs/superpowers/specs/2026-10-27-unison-prototype-design.md` — desain prototipe
- `docs/superpowers/plans/2026-10-27-unison-prototype.md` — rencana implementasi
- `docs/superpowers/plans/2026-10-27-unison-oauth-integration.md` — rencana integrasi OAuth
- `IDEA.md` · `PRD.md` · `DESIGN.md` — konsep, kebutuhan produk, sistem desain
