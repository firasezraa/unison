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

## Dokumen

- `docs/superpowers/specs/2026-10-27-unison-prototype-design.md` — desain prototipe ini
- `docs/superpowers/plans/2026-10-27-unison-prototype.md` — rencana implementasi
- `IDEA.md`, `PRD.md`, `DESIGN.md` — konsep, kebutuhan produk, dan sistem desain
