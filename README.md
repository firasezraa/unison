# Unison — prototipe pemutar musik lintas layanan

Prototipe frontend untuk **Unison**: satu pencarian, satu antrean, dan satu pemutar untuk lagu dari beberapa layanan streaming. Dibangun dari `IDEA.md`, `PRD.md`, dan `DESIGN.md`.

> **Ini prototipe, bukan produk.** Tidak ada audio nyata, tidak ada OAuth, tidak ada akun, dan tidak ada token. Semua pemutaran disimulasikan dengan timer yang dipercepat. Tujuannya memvalidasi UX pencarian lintas layanan, antrean campuran, dan momen pindah layanan (handoff) sebelum integrasi SDK provider dikerjakan.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # unit test logika murni (Vitest)
npm run build    # tsc + vite build
npm run lint     # oxlint
```

## Rute

| Rute | Isi |
|---|---|
| `#/` | Beranda: lanjutkan mendengar, playlist terbaru, status layanan |
| `#/cari` | Pencarian terpadu per layanan |
| `#/library` | Library: Lagu, Album, Artis, Playlist + filter layanan |
| `#/playlist/:id` | Detail playlist campuran |
| `#/koneksi` | Koneksi layanan, status, syarat, kemampuan |
| `#/pengaturan` | Tema, bahasa, prioritas layanan, privasi & data |

## Yang bisa dicoba

- **Pencarian lintas layanan** — ketik `hujan`. Apple Music muncul lebih dulu, lalu Spotify dan SoundCloud menyusul di bawah tanpa membuat daftar melompat. TIDAL paling lambat.
- **Layanan yang gagal** — ketik `xhujan`. TIDAL menampilkan "Hasil dari TIDAL belum tersedia." sementara hasil layanan lain tetap tampil, dengan tombol Coba lagi. (Huruf `x` di awal adalah pemicu galat khusus demo dan tidak ikut dicari.)
- **Antrean campuran** — putar lagu dari satu layanan lalu "Tambah ke antrean" lagu dari layanan lain. Ubah urutan dengan tombol naik/turun (setara dengan drag).
- **Handoff** — biarkan lagu selesai, atau lompati dengan tombol berikutnya. Bilah progres berganti benang dari warna layanan lama ke layanan baru, dengan teks "Memuat dari …".
- **Handoff gagal** — aktifkan "Paksa gagal saat pindah layanan" di panel Antrean, lalu picu handoff. Setelah 8 detik lagu dilewati dengan alasan yang jelas, dan antrean tetap rapi.
- **Status koneksi** — di `#/koneksi`, putuskan atau sambungkan ulang layanan. Lagu dari layanan yang perlu sambung ulang tetap muncul di antrean dengan penanda, tidak dihapus diam-diam.
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

## Catatan implementasi

- **Stack:** Vite, React, TypeScript, Vitest. CSS biasa dengan custom property token dari `DESIGN.md`; tanpa kerangka CSS dan tanpa bayangan.
- **Font:** Poppins 400/500/700, di-self-host lewat `@fontsource/poppins` (menggantikan Schibsted Grotesk pada `DESIGN.md` §4.3 atas permintaan pemilik produk).
- **Logika murni & teruji:** `src/state/queue.ts` (reducer antrean, termasuk aturan hapus/pindah), `src/state/handoff.ts` (state machine handoff + batas waktu 8 detik), `src/state/search.ts` (isolasi kegagalan per layanan, hasil lambat menempel di bawah), `src/state/playback.ts` (posisi dan format waktu).
- **Provider adapter:** data layanan dan lagu ada di `src/data/`, di belakang tipe `Provider`, `Track`, dan `ProviderId` di `src/domain/types.ts`. Mengganti mock dengan SDK nyata berarti mengisi `check()`/`beginTrack()` di `src/app/UnisonContext.tsx` dengan adapter sungguhan.
- **Aksesibilitas:** landmark dan heading per layar, `role="slider"` dengan `aria-valuetext` untuk progres, `aria-live="polite"` untuk perubahan lagu dan status handoff, fokus terlihat, target sentuh ≥ 44px, `dir="auto"` pada judul/artis, dukungan `prefers-reduced-motion` dan `forced-colors`, serta kode huruf layanan di samping warna.

## Integrasi OAuth, token, dan provider (fase arsitektur)

Backend Unison live di project Supabase **`unison`** (ref `cliujpbiecvbskxiyxny`, region `ap-southeast-1`, paket Free, $0/bulan).

### Apa yang sudah terpasang & terverifikasi

- **Skema + RLS** (`supabase/migrations/0001_init.sql`): `private.provider_accounts` (token), `private.oauth_states` (state PKCE), dan tabel publik `playlists`, `playlist_items`, `play_history`, `sync_jobs`. Semua `public` memakai RLS policy owner `auth.uid()`.
- **Fungsi pembungkus service-role-only** (`0002_private_access_functions.sql`): `unison_oauth_insert_state`, `unison_oauth_consume_state`, `unison_provider_upsert`, `unison_provider_status`, `unison_provider_disconnect`. Terverifikasi `anon_exec=false, auth_exec=false, svc_exec=true` — hanya service_role yang bisa memanggil.
- **Token terenkripsi AES-256-GCM** (`supabase/functions/_shared/crypto.ts`): kunci `TOKEN_ENCRYPTION_KEY` hanya di secret Edge Function; ciphertext di `private.provider_accounts.token_ciphertext`, tidak pernah ke klien.
- **Empat Edge Function** (ter-deploy, terverifikasi lewat HTTP): `oauth-authorize` (401 tanpa JWT), `oauth-callback` (302 redirect), `provider-status` (401 tanpa JWT), `apple-developer-token` (401 tanpa JWT; 503 jujur bila kunci Apple belum diisi).

### Alur OAuth 2.1 PKCE

```
Klien → POST /functions/v1/oauth-authorize {provider}   (dengan JWT user)
      → server buat state + code_verifier, simpan ke private.oauth_states
      → balas authorizationUrl → browser diarahkan ke provider
Provider → redirect ke /functions/v1/oauth-callback?code&state
      → server cocokkan state (sekali pakai, 10 menit), tukar code (client_secret + code_verifier)
      → enkripsi token, simpan ke private.provider_accounts
      → redirect ke aplikasi (#/koneksi?status=connected&provider=…)
```

`code_verifier` dan `client_secret` tidak pernah menyentuh klien; `state` mencegah CSRF.

### Cara mengisi kredensial

Salin `.env.example`, isi variabel `VITE_*` untuk frontend, lalu set secret Edge Function (Dashboard Supabase > Edge Functions > Secrets): `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`, `OAUTH_REDIRECT_URI`, `APP_REDIRECT_URI`, dan `*_CLIENT_ID`/`*_CLIENT_SECRET` per provider. Lihat `.env.example` untuk daftar lengkap.

### Status jujur

Tanpa akun berbayar, **playback nyata Apple Music / Spotify tidak mungkin** (butuh Apple Developer Program $99/tahun + langganan; Spotify Premium untuk Dev Mode + pengguna). Fondasi arsitektur ini sudah jadi dan teruji; yang tersisa untuk Fase 0 adalah mengisi kredensial satu provider, memverifikasi endpoint TIDAL, dan memuat SDK (MusicKit JS / Web Playback SDK) di klien.

> **Catatan import:** repo memakai `../_shared/*` (konvensi `supabase functions deploy` CLI), sedangkan deploy lewat MCP memakai `./_shared/*`. Isi modul identik; hanya jalur import yang berbeda.

## Dokumen


- `docs/superpowers/specs/2026-10-27-unison-prototype-design.md` — desain prototipe ini
- `docs/superpowers/plans/2026-10-27-unison-prototype.md` — rencana implementasi
- `IDEA.md`, `PRD.md`, `DESIGN.md` — konsep, kebutuhan produk, dan sistem desain
