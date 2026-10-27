# Unison — Web Music Player Lintas Layanan Streaming

> **Status:** ide awal (draft) · **Tanggal:** 27 Oktober 2026 · **Nama:** sementara, bebas diganti · **Revisi:** database & backend memakai **Supabase**
>
> Catatan: bagian [6. Realita Integrasi](#6-realita-integrasi) dicek ke sumber resmi/terbaru per tanggal di atas. Kebijakan API sering berubah, jadi **verifikasi ulang sebelum mulai membangun**.

---

## 1. Ringkasan

Satu web player dengan antarmuka ala Spotify yang bisa menghubungkan **beberapa akun langganan streaming musik sekaligus** (Spotify, Apple Music, TIDAL, YouTube, SoundCloud, dll). Pengguna mendapat **satu library, satu pencarian, satu antrean, dan satu playlist** yang isinya boleh campuran dari berbagai layanan.

**Kalimat kunci:** *Unison bukan sumber musik baru. Unison adalah "remote + otak" yang mengorkestrasi langganan yang sudah dibayar pengguna.*

## 2. Masalah yang Ingin Diselesaikan

- Orang berlangganan lebih dari satu layanan (atau pindah-pindah) dan library-nya **terpecah**.
- Playlist tidak bisa dibawa antar layanan; pindah layanan = mulai dari nol.
- Lagu yang sama ada di beberapa layanan, tapi pengguna harus menebak mana yang punya.
- Tidak ada satu tempat untuk melihat **riwayat dengar dan statistik** lintas layanan.
- Tiap layanan punya UI, rekomendasi, dan ekosistem sendiri yang saling terkunci.

## 3. Visi & Prinsip Desain

1. **Hormati hak cipta dan ToS.** Audio selalu diputar lewat SDK/player resmi tiap layanan. Tidak ada scraping, stream ripping, atau bypass DRM.
2. **Pengguna memiliki datanya.** Library dan playlist bisa diekspor kapan saja.
3. **Provider-agnostic.** Menambah layanan baru = menulis satu adapter, bukan menulis ulang aplikasi.
4. **Degradasi yang anggun.** Jika satu layanan putus atau tidak punya lagu, aplikasi tetap berguna.
5. **Cepat dan terasa seperti Spotify** — keyboard shortcut, media keys, PWA.

## 4. Target Pengguna

| Persona | Kebutuhan |
|---|---|
| **Pemburu katalog** — langganan 2+ layanan | Satu library dan satu pencarian |
| **Audiophile** | Pilih otomatis sumber berkualitas tertinggi untuk tiap lagu |
| **Pindahan** — ganti layanan | Migrasi playlist dan favorit tanpa kehilangan |
| **Data nerd** | Statistik dengar lintas layanan, scrobble ke ListenBrainz/Last.fm |
| **Developer/hobbyist** | Mode self-hosted, open-source |

## 5. Fitur

### 5.1 MVP

- Login + hubungkan akun layanan (OAuth).
- **Pencarian terpadu** dengan badge sumber di tiap hasil.
- **Library terpadu** (lagu favorit, album, playlist) dari semua layanan terhubung, hanya baca.
- **Pemutar web** (play/pause/seek/volume/next/prev) dengan antrean lintas layanan.
- **Playlist internal Unison** yang boleh berisi lagu dari layanan berbeda.
- Media Session API (kontrol dari keyboard, lock screen, headset).
- Dark mode, responsif, installable sebagai PWA.

### 5.2 Setelah MVP

- **Pencocokan lagu lintas layanan** (lihat §7.4) dan pemilihan sumber otomatis berdasarkan preferensi (misalnya "utamakan TIDAL, fallback Spotify").
- **Transfer/sync playlist** antar layanan (tulis balik ke layanan yang API-nya mengizinkan).
- **Riwayat dengar terpadu + statistik** (top artis, jam dengar, heatmap).
- Scrobbling ke ListenBrainz / Last.fm.
- Lirik, info artis/album dari MusicBrainz.
- Impor/ekspor playlist (JSON, M3U, CSV).
- Sinkronisasi "now playing" antar perangkat via WebSocket.

### 5.3 Ide liar (jangka panjang)

- **Jam / mode kolaboratif:** teman dengan layanan berbeda mengantre ke satu sesi yang sama; tiap orang mendengar lewat langganannya sendiri.
- **Smart radio** dari riwayat dengar sendiri (tidak bergantung rekomendasi layanan).
- **Sumber tambahan legal:** file lokal milik pengguna, Audius, Jamendo, Internet Archive (cek lisensi tiap sumber).
- Ekstensi browser untuk "Buka di Unison" dari link Spotify/Apple Music/dll.

---

## 6. Realita Integrasi

> Ini bagian paling menentukan kelayakan ide. Banyak ide serupa gagal di sini.

### 6.1 Prinsip dasar: Unison tidak memegang audio

Audio hanya boleh diputar lewat **SDK resmi tiap layanan** (DRM, Widevine/EME). Artinya:

- Unison **tidak bisa** menggabungkan stream dari beberapa layanan menjadi satu pipeline audio (tanpa crossfade/gapless lintas layanan, tanpa equalizer global atas audio ber-DRM).
- Hanya **satu provider memutar pada satu waktu**. Pindah lagu dari layanan A ke B akan ada jeda (perkiraan 0,5–3 detik) karena player B harus dimuat dulu.
- Browser mewajibkan **interaksi pengguna** sebelum audio boleh diputar (autoplay policy). Playback di tab latar, terutama di mobile, bisa dibatasi browser.

### 6.2 Status tiap layanan

| Layanan | Jalur integrasi | Syarat | Catatan & batasan |
|---|---|---|---|
| **Spotify** | Web API + Web Playback SDK | Pengguna harus **Premium** | **Hambatan terbesar**, lihat §6.3 |
| **Apple Music** | MusicKit JS (API + playback di web) | Pengguna berlangganan; developer butuh developer token dari Apple Developer Program | Jalur paling "ramah web" untuk playback penuh di browser |
| **TIDAL** | TIDAL API via Developer Portal + SDK player | Registrasi app | Verifikasi cakupan playback untuk pihak ketiga dan kualitas audio |
| **YouTube** | YouTube IFrame Player API | Tanpa langganan (Premium opsional) | Player harus ditampilkan sesuai ToS, tidak bisa "audio-only tersembunyi" (cek ToS). **YouTube Music tidak punya API publik resmi setahu saya**, verifikasi |
| **SoundCloud** | API + Widget | Perlu mendaftar/diapprove untuk akses API | Cocok untuk musik indie/remix |
| **Deezer** | Deezer API | — | **Verifikasi** apakah pendaftaran app baru masih dibuka dan apa cakupannya |
| **Amazon Music, JOOX, layanan lokal lain** | Kemungkinan tidak ada jalur resmi untuk playback pihak ketiga | — | Jangan scraping/reverse-engineering. Bisa jadi "tidak didukung" atau hanya impor playlist |

### 6.3 Hambatan Spotify (temuan terbaru)

Berdasarkan sumber yang saya periksa (laporan TechCrunch, dokumentasi Spotify, thread komunitas Spotify):

- Sejak **Februari/Maret 2026**, aplikasi *Development Mode* mensyaratkan akun pemilik app berstatus **Premium**, dibatasi **satu Client ID per developer**, dan hanya boleh **5 pengguna yang di-allowlist**; pengguna di luar daftar menerima error 403.
- Untuk melepas batas itu perlu **Extended Quota Mode**. Sejak Mei 2025 kriterianya: **badan usaha terdaftar, layanan aktif yang sudah diluncurkan, dan sekitar 250.000+ MAU**.
- Beberapa endpoint (mis. artis terkait, top tracks) dan sejumlah field (mis. `preview_url`) tidak tersedia untuk app baru. Perubahan Februari 2026 juga menyentuh sejumlah field/endpoint. **Cek apakah `isrc` dan endpoint library yang dibutuhkan masih tersedia.**

**Konsekuensi untuk produk:** versi publik "buka untuk semua orang" dengan Spotify tidak realistis di awal. Opsi strategi:

| Opsi | Cara kerja | Plus | Minus |
|---|---|---|---|
| **A. Self-hosted / BYO key** | Tiap pengguna membuat Spotify app sendiri (butuh Premium) dan memasukkan Client ID ke instance Unison-nya | Legal, tanpa batas 5 pengguna | Onboarding teknis, cocok untuk hobbyist |
| **B. Mulai tanpa Spotify** | Luncurkan dengan Apple Music + TIDAL + YouTube + SoundCloud; Spotify menyusul | Bisa publik sejak awal | Kehilangan layanan terbesar |
| **C. Beta tertutup** | Dev Mode dengan ≤5 penguji untuk validasi | Cepat memvalidasi UX | Tidak skalabel |
| **D. Kejar Extended Quota** | Setelah punya badan usaha dan traksi | Jalur resmi penuh | Syarat sulit dipenuhi dari nol |

**Rekomendasi awal:** kombinasi **B + A (+ C untuk validasi)**.

### 6.4 Konsekuensi desain

- Arsitektur harus **adapter per provider** dengan deklarasi *capabilities* (bisa play? baca library? tulis playlist?). UI menyesuaikan.
- Mobile web: Spotify Web Playback SDK umumnya tidak didukung di browser mobile (verifikasi). Fallback: mode **remote control** ke aplikasi resmi lewat Spotify Connect.
- Jangan menjanjikan fitur seperti crossfade lintas layanan, download offline, atau EQ global.

---

## 7. Arsitektur

### 7.1 Gambaran umum

```
┌──────────────────────────── Browser (SPA / PWA) ─────────────────────────────┐
│  UI (search, library, queue, playlist)                                       │
│  Playback Orchestrator ──► Provider Adapter (Spotify | Apple | TIDAL | …)    │
│        │                        └─ SDK resmi memutar audio (DRM)             │
│        └─ Queue (milik Unison) · Media Session API                           │
└──────────────┬───────────────────────────────────────────────────────────────┘
               │ HTTPS / WebSocket
┌──────────────▼────────────────────────── Supabase ───────────────────────────┐
│  Auth (login + RLS) · Edge Functions (OAuth broker PKCE, matcher, scrobble)  │
│  Queues (pgmq) + Cron → sync library & riwayat · Realtime (now playing)      │
│  Postgres (data) · Vault (token terenkripsi) · Storage (artwork, ekspor)     │
└──────────────┬───────────────────────────────────────────────────────────────┘
               │ (opsional) worker Node/Go terpisah untuk sync berat
               │
      API eksternal: layanan streaming · MusicBrainz · ListenBrainz/Last.fm
```

### 7.2 Kontrak adapter (sketsa)

```ts
type ProviderId = 'spotify' | 'apple' | 'tidal' | 'youtube' | 'soundcloud';

interface Capabilities {
  playback: boolean;
  libraryRead: boolean;
  playlistWrite: boolean;
  isrcAvailable: boolean;
  lyrics: boolean;
}

interface MusicProvider {
  id: ProviderId;
  capabilities: Capabilities;
  connect(): Promise<void>;          // OAuth / authorize
  disconnect(): Promise<void>;
  search(query: string): Promise<ProviderTrack[]>;
  getLibrary(): AsyncIterable<ProviderTrack>;
  getPlaylists(): AsyncIterable<ProviderPlaylist>;
  player: ProviderPlayer;
}

interface ProviderPlayer {
  load(ref: ProviderTrackRef): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(ms: number): Promise<void>;
  setVolume(v: number): void;
  on(event: 'ended' | 'progress' | 'error' | 'ready', cb: (e: unknown) => void): void;
}
```

### 7.3 Model data (inti)

| Tabel | Isi penting |
|---|---|
| `profiles` | id (= `auth.users.id`), preferensi (urutan prioritas provider, kualitas) |
| `provider_accounts` *(schema `private`)* | user_id, provider, referensi secret di Vault, scope, expires_at, status, last_sync |
| `canonical_tracks` | id, isrc, judul, artis, album, durasi_ms, mbid |
| `provider_tracks` | provider, provider_track_id, canonical_id, confidence, region_available |
| `playlists` | id, user_id, nama, deskripsi |
| `playlist_items` | playlist_id, canonical_id, urutan, preferred_provider (opsional) |
| `play_history` | user_id, canonical_id, provider, played_at, durasi_didengar |
| `sync_jobs` | user_id, provider, jenis (library/riwayat), cursor, status, error, updated_at |

Playlist menyimpan **referensi kanonik**, bukan file audio. Saat diputar, orchestrator memilih provider terbaik yang dimiliki pengguna.

### 7.4 Pencocokan lagu lintas layanan

1. **ISRC cocok persis** (paling andal, bila API menyediakan field-nya).
2. **Fuzzy:** judul + artis (dinormalisasi, hapus "(Remastered)", "feat.", dll) + durasi ±3 detik.
3. **Konfirmasi manual** untuk skor menengah; keputusan disimpan agar tidak ditanya ulang.
4. Perhatikan edge case: versi live/remaster/deluxe, ketersediaan per negara.

### 7.5 Alur playback

```
User klik lagu → Orchestrator cari ProviderTrackRef sesuai prioritas
 → adapter.player.load() → play()
 → event 'ended' → ambil item antrean berikutnya
 → bila provider berbeda: load player berikutnya (ada jeda), update Media Session
 → catat ke play_history; kirim scrobble
 → bila lagu tidak tersedia: fallback ke provider lain atau lewati dengan notifikasi
```

---

## 8. Usulan Tech Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend | **React/Next.js** atau **SvelteKit**, TypeScript, Tailwind | Ekosistem luas, PWA mudah |
| State | Zustand / TanStack Query | Antrean dan cache library |
| Database | **Supabase Postgres** | Postgres terkelola, relasional + JSONB, RLS bawaan, migrasi lewat Supabase CLI |
| Auth (login Unison) | **Supabase Auth** | Email/magic link/social login, JWT terintegrasi dengan RLS |
| Penautan akun musik | **Edge Functions** (OAuth 2.0 **PKCE**) | Terpisah dari login; token disimpan di sisi server |
| Backend/API | **Supabase Edge Functions** (TypeScript/Deno) + PostgREST | Tanpa server sendiri; logika inti (adapter, matcher) tetap modul TS murni |
| Job & antrean | **Supabase Queues (pgmq)** + **Cron (pg_cron)** | Pengganti Redis/BullMQ untuk sync library & riwayat |
| Realtime | **Supabase Realtime** (Broadcast/Presence) | Sinkron now-playing antar perangkat tanpa server WebSocket sendiri |
| File | **Supabase Storage** | Cache artwork (bila ToS mengizinkan), hasil ekspor playlist |
| Rahasia | **Supabase Vault** + secret Edge Function | Token layanan musik, private key Apple Music |
| Worker berat *(opsional)* | Node.js atau Go kecil | Hanya bila sync melewati batas waktu Edge Function |
| Hosting frontend | Vercel / Cloudflare Pages / Netlify | Deploy statis/SSR yang mudah |
| Self-host *(mode §6.3 opsi A)* | Supabase self-hosted (Docker) atau Supabase CLI lokal | Satu stack lengkap untuk hobbyist, lebih berat dari Postgres polos |
| Observability | Sentry + log terstruktur | Debug integrasi yang rawan berubah |

### 8.1 Catatan Khusus Supabase

**1. Login ≠ menautkan akun musik.** Pengguna login ke Unison via Supabase Auth, lalu menautkan Spotify/Apple Music/TIDAL lewat alur OAuth terpisah yang dijalankan di Edge Function. Alasannya: satu pengguna bisa punya banyak akun musik dengan scope berbeda dari scope login. Kalaupun memakai Spotify sebagai provider login Supabase, sepengetahuan saya token provider (`provider_token`/`provider_refresh_token`) hanya tersedia saat sesi login dan tidak disimpan otomatis. Verifikasi di dokumentasi Supabase Auth, dan simpan sendiri bila perlu.

**2. Token layanan musik = data paling sensitif.**
- Simpan di **schema non-publik** (`private`), jangan di-*expose* lewat Data API, dan akses hanya dari Edge Function dengan service role.
- Enkripsi memakai **Supabase Vault** (atau enkripsi tingkat aplikasi). Jangan pernah mengirim token ke klien.
- Developer token Apple Music (JWT ditandatangani private key) disimpan sebagai **secret Edge Function**; sediakan endpoint kecil yang menerbitkan token berumur pendek.

**3. RLS wajib di semua tabel `public`.**
- Tabel milik pengguna (`playlists`, `playlist_items`, `play_history`, `profiles`, `sync_jobs`): hanya pemilik (`auth.uid()`) yang boleh baca/tulis.
- Tabel bersama (`canonical_tracks`, `provider_tracks`): baca untuk pengguna terautentikasi, tulis hanya service role. Cek dulu apakah ToS layanan mengizinkan menyimpan metadata tersebut (lihat §9).

**4. Sync berjalan lewat antrean, bukan satu request panjang.** Cron memicu Edge Function yang mengambil beberapa pesan dari antrean, menarik library **per halaman**, menyimpan `cursor` di `sync_jobs`, lalu melanjutkan di putaran berikutnya. Edge Function punya batas waktu eksekusi, jadi desain ini menghindarinya. Bila tetap berat, pindahkan ke worker terpisah.

**5. Realtime.** Gunakan **channel privat per pengguna** (dengan otorisasi Realtime) untuk now-playing dan kontrol antar perangkat, supaya status dengar tidak bisa disadap pengguna lain.

**6. Kebiasaan pengembangan.** Skema dan RLS ditulis sebagai **migrasi di git** (`supabase/migrations`), generate tipe TypeScript dari skema, dan uji lokal dengan Supabase CLI.

**7. Biaya, batas, dan lock-in.**
- Cek batas paket (ukuran DB, invokasi Edge Function, koneksi Realtime, kebijakan proyek tidak aktif pada paket gratis) sebelum merencanakan beta publik.
- Data tetap Postgres standar, jadi portabel. Bagian yang lebih terikat: Auth, Realtime, Edge Functions (Deno). Karena itu pertahankan logika bisnis (adapter, matcher, orkestrator) sebagai **modul TypeScript murni** yang bisa dipindah ke Node/Go.

**Sketsa skema (ringkas):**

```sql
-- schema non-publik untuk token (tidak di-expose ke Data API)
create schema if not exists private;

create table private.provider_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  provider        text not null,            -- 'spotify' | 'apple' | 'tidal' | ...
  token_secret_id uuid,                     -- id secret di Supabase Vault (access + refresh token)
  scope           text,
  expires_at      timestamptz,
  status          text not null default 'active',
  last_sync_at    timestamptz,
  unique (user_id, provider)
);

-- tabel milik pengguna + RLS
create table public.playlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.playlists enable row level security;

create policy "playlists_owner_all" on public.playlists
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

---

## 9. Keamanan, Privasi, Legal

- **Token OAuth** dienkripsi at-rest (Supabase Vault atau enkripsi aplikasi), disimpan di schema non-publik dan hanya diakses Edge Function, hak akses minimum (scope sekecil mungkin), rotasi dan pencabutan mudah.
- **RLS** aktif di semua tabel `public`; service role key **tidak pernah** dikirim ke klien.
- **Developer Terms tiap layanan** wajib dibaca, terutama soal: caching metadata, penyimpanan data pengguna, tampilan atribusi/logo, **monetisasi**, dan larangan tertentu. Beberapa layanan membatasi penggunaan komersial.
- **Privasi:** riwayat dengar itu data sensitif. Sediakan hapus akun, ekspor data, dan jelaskan data yang disimpan. Untuk pengguna Indonesia, perhatikan **UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022)**; jika menarget pengguna Eropa, GDPR.
- **Merek dagang:** nama dan logo layanan hanya dipakai sesuai brand guidelines masing-masing. Hindari kesan "resmi/berafiliasi".
- **Konsultasikan ahli hukum** sebelum peluncuran publik atau monetisasi (saya bukan penasihat hukum).

## 10. Sketsa UX

```
┌───────────┬────────────────────────────────────────────┬──────────────┐
│ Sidebar   │  Konten utama                              │ Antrean      │
│ • Beranda │  [Pencarian terpadu........ ]              │ 1. Lagu A ●S │
│ • Cari    │  Hasil: Lagu X   ●S ●A ●T  ← badge sumber  │ 2. Lagu B ●A │
│ • Library │         Lagu Y   ●T                        │ 3. Lagu C ●T │
│ • Playlist│  Playlist "Roadtrip" (campuran 3 layanan)  │              │
│ • Statistik│                                           │              │
│ • Akun    │                                            │              │
├───────────┴────────────────────────────────────────────┴──────────────┤
│ ▶ Judul – Artis      ──────●──────  2:14/3:40   🔊   Sumber: TIDAL ▾   │
└───────────────────────────────────────────────────────────────────────┘
 ●S Spotify · ●A Apple Music · ●T TIDAL (badge berwarna di UI nyata)
```

Detail penting: **badge sumber** di tiap lagu, **pemilih sumber** pada pemutar ("putar dari: …"), indikator lagu tidak tersedia, dan layar *Connections* yang jujur menampilkan kemampuan tiap layanan.

---

## 11. Roadmap

| Fase | Durasi (perkiraan) | Isi | Kriteria selesai |
|---|---|---|---|
| **0. Spike teknis** | 1–2 minggu | Satu halaman web yang memutar 1 lagu dari Apple Music dan 1 dari layanan lain berurutan | Bukti bahwa transisi lintas provider layak |
| **1. MVP** | 6–8 minggu | Login, 2–3 provider, pencarian, library baca-saja, antrean, playlist internal, PWA | 10–20 penguji memakainya harian |
| **2. Cerdas** | 6–8 minggu | Matcher ISRC/fuzzy, prioritas sumber, statistik, scrobble, ekspor/impor | Playlist campuran berfungsi tanpa intervensi |
| **3. Sync** | 4–6 minggu | Transfer playlist antar layanan, tulis balik | Migrasi 500 lagu dengan akurasi tinggi |
| **4. Sosial & Skala** | Terbuka | Sesi kolaboratif, provider tambahan, aplikasi mobile/desktop (Tauri/Electron) | Tergantung traksi |

## 12. Monetisasi (opsional, cek ToS dulu)

- **Freemium:** gratis untuk 2 layanan; **Pro** untuk layanan tak terbatas, sync otomatis, statistik lengkap, scrobble.
- **Self-hosted open-source** gratis; dukungan/hosting berbayar.
- **Jangan** menjual akses ke musik atau meniru langganan layanan. Nilai jual adalah *orkestrasi, library terpadu, dan data*.
- Periksa apakah Developer Terms layanan yang dipakai mengizinkan penarikan biaya untuk fitur yang memakai API mereka.

## 13. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Layanan mengubah/membatasi API (sudah terjadi pada Spotify) | Fitur mati mendadak | Adapter terisolasi, capability flags, jangan bergantung pada satu provider |
| Batas pengguna Spotify (Dev Mode) | Tidak bisa skalakan | Strategi §6.3 (B + A) |
| Transisi lintas provider terasa janggal | UX buruk | Beri indikator "memuat sumber berikutnya", preload sebisanya, jelaskan sejak awal |
| Pencocokan lagu salah | Lagu keliru dalam playlist | ISRC dulu, konfirmasi manual, tampilkan skor keyakinan |
| Pelanggaran ToS | Akses dicabut / masalah hukum | Hanya SDK resmi, review legal, tanpa scraping |
| Kebocoran token | Akun pengguna terancam | Vault/enkripsi, schema `private` + RLS, scope minimum, audit, pencabutan cepat |
| Ketergantungan pada Supabase (batas paket, batas Edge Function, lock-in sebagian) | Biaya naik / sulit pindah | Logika bisnis sebagai modul TS murni, data tetap Postgres standar, opsi self-host |
| Browser mobile membatasi playback latar | Pengalaman mobile terbatas | PWA + mode remote control; pertimbangkan app native nanti |

## 14. Pembanding yang Layak Diriset

(Sebagai titik awal riset, verifikasi fitur terkini masing-masing.)

- **Soundiiz, TuneMyMusic**: transfer/sinkron playlist antar layanan (tanpa pemutar).
- **Roon**: library terpadu untuk file lokal + layanan tertentu, fokus audiophile.
- **Last.fm / ListenBrainz**: scrobbling dan statistik lintas pemutar.
- **Odesli (song.link)**: tautan satu lagu untuk banyak layanan.

**Celah peluang:** pemutar web *interaktif* dengan antrean lintas layanan, bukan sekadar transfer playlist.

## 15. Pertanyaan Terbuka

1. Target awal: **publik**, **komunitas hobbyist (self-hosted)**, atau **alat pribadi**?
2. Layanan mana yang paling banyak dipakai calon pengguna (terutama di Indonesia)? Apakah JOOX/layanan lokal perlu dipertimbangkan?
3. Seberapa penting **playback** dibanding sekadar **library & transfer playlist**? (Transfer playlist jauh lebih mudah dan lebih aman secara legal.)
4. Apakah jeda 0,5–3 detik antar layanan bisa diterima pengguna target?
5. Siapa yang menanggung biaya akun developer (Apple Developer Program, Spotify Premium untuk akun developer)?
6. Apakah ada rencana badan usaha (untuk Extended Quota dan perjanjian komersial)?

## 16. Langkah Berikutnya

- [ ] Baca ulang Developer Terms Spotify, Apple Music, TIDAL, YouTube, SoundCloud (catat larangan monetisasi & caching).
- [ ] Daftarkan akun developer di 2–3 layanan; uji OAuth dan playback di halaman sederhana (**Fase 0**).
- [ ] Verifikasi ketersediaan `isrc` dan endpoint library setelah perubahan API Spotify Februari 2026.
- [ ] Putuskan strategi Spotify (A/B/C/D) dan target awal (§15 no. 1).
- [ ] Buat prototipe UI (Figma) untuk pencarian terpadu, pemutar, dan layar *Connections*.
- [ ] Buat project Supabase (atau `supabase init` untuk lokal), rancang skema + RLS, simpan migrasi di repo.
- [ ] Rancang alur penautan akun musik (OAuth di Edge Function) yang terpisah dari login Supabase Auth.
- [ ] Cek batas paket Supabase (DB, Edge Function, Realtime) terhadap target beta.
- [ ] Wawancarai 5–10 calon pengguna: seberapa sakit masalah library terpecah?

---

### Sumber yang diperiksa (27 Okt 2026)

- Perubahan Developer Mode Spotify (Feb 2026): laporan TechCrunch dan dokumentasi *Quota modes* Spotify for Developers
- Kriteria Extended Quota: blog Spotify *Updating the Criteria for Web API Extended Access* (15 Apr 2025)
- Thread komunitas Spotify *February 2026 Spotify for Developers update*
- Apple: dokumentasi MusicKit on the Web / sesi WWDC22 *Meet MusicKit for Web*
- Supabase docs: Queues (pgmq), Cron (pg_cron), Edge Functions, Vault
