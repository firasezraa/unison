# Unison Prototype — Design

## Intent

Membuktikan UX inti Unison sebelum OAuth, Supabase, dan SDK playback provider masuk. Prototype harus terasa seperti satu player lintas layanan, tetapi jujur soal batasan handoff.

## Pengguna dan hasil

Pengguna Indonesia yang memakai lebih dari satu layanan streaming dapat:

- mencari lagu dari beberapa layanan dalam satu tempat;
- menambahkan dan mengubah urutan antrean;
- memutar simulasi lagu dari antrean campuran;
- melihat handoff AM → SP dengan status pemuatan;
- memahami status koneksi dan kemampuan tiap layanan.

## Goals

- Desktop tiga panel pada layar lebar.
- Layout responsif untuk tablet dan mobile.
- Tiga layar inti: Pencarian, Koneksi, Sedang diputar/Antrean.
- Mock playback dengan kontrol play/pause, seek, previous, next, volume.
- Simulasi handoff lintas layanan dengan timeout/gagal yang dapat dipicu untuk uji UX.
- Tema terang/gelap/sistem.
- Keyboard shortcut sesuai DESIGN.md.
- Badge kode layanan selalu terbaca, bukan warna saja.
- Reduced motion, fokus keyboard, live region, target sentuh minimal 44px.
- Struktur provider adapter yang dapat diganti implementasi nyata nanti.

## Non-goals

- OAuth dan login nyata.
- Supabase, persistence server, RLS, atau token.
- Audio nyata, DRM, SDK provider, dan Media Session penuh.
- Sinkronisasi library.
- Pencocokan ISRC.
- Playlist persistence.
- Production deployment.

## Anti-goals

- Jangan menyamarkan mock playback sebagai audio nyata.
- Jangan memakai logo resmi provider sebagai pengganti integrasi resmi.
- Jangan memakai shadow, gradient dekoratif, atau animasi masuk.
- Jangan membuat fitur provider seolah tersedia bila capability mock menyatakan tidak tersedia.

## Pendekatan yang dipertimbangkan

### A. React + TypeScript + Vite — dipilih

State lokal terstruktur, komponen mudah diuji, responsive UI cepat dibuat, dan kontrak adapter TypeScript dapat dipertahankan saat provider nyata ditambahkan. Mock data membuat prototype bebas dari kredensial dan API eksternal.

Trade-off: perlu dependency install dan setup build.

### B. HTML/CSS/JavaScript tanpa framework

Setup paling kecil dan cocok untuk screenshot spike.

Trade-off: state queue/player dan accessibility lebih mudah berantakan; migrasi ke aplikasi nyata akan membuang sebagian besar kode.

### C. Full-stack React + Supabase

Bisa menguji auth dan data nyata sejak awal.

Trade-off: memperbesar scope sebelum UX handoff tervalidasi; OAuth, token, dan ToS menjadi blocker; belum ada bukti provider playback yang layak.

## Keputusan teknis

- Stack: Vite, React, TypeScript.
- Styling: CSS biasa dengan custom properties token dari DESIGN.md; tanpa Tailwind dependency bila tidak diperlukan.
- State: React state/context lokal. Pisahkan state playback, queue, dan UI.
- Data: mock provider adapters dan mock tracks di source code.
- Routing: client-side view state sederhana; gunakan URL hash bila membantu navigasi tanpa menambah router dependency.
- Font: **Poppins** (400, 500, 700) sebagai font UI dan judul, di-self-host lewat paket `@fontsource/poppins` (bukan CDN) dengan fallback `system-ui`. `font-display: swap`. Angka waktu memakai `font-variant-numeric: tabular-nums`. Teks bacaan panjang (lirik) memakai Literata bila nanti diperlukan; prototype belum menampilkan lirik. Ini menggantikan Schibsted Grotesk pada DESIGN.md §4.3 sesuai permintaan pemilik produk.
- Icons: inline SVG sederhana dan label accessible; tidak menambah icon package kecuali dependency sudah tersedia.
- Testing: unit/component test untuk queue, handoff state, keyboard shortcut, dan aksesibilitas dasar bila test runner tersedia di repo.

## Model interaksi

### Search

Input pencarian menampilkan hasil per provider. Hasil provider tercepat muncul dulu; hasil lain ditambahkan di bawah tanpa mengacak hasil yang sudah terlihat. Provider gagal memiliki baris status dan aksi Coba lagi.

### Queue

Klik Putar memainkan track dan memasukkan track berikutnya bila diperlukan. Tambah ke antrean menambah item. Putar berikutnya menyisipkan item setelah item aktif. Item dapat dihapus dan dipindah naik/turun lewat tombol keyboard-accessible.

### Playback dan handoff

Mock player memakai timer. Saat track selesai:

1. track berikutnya diambil;
2. jika provider sama, playback lanjut;
3. jika provider berbeda, status menjadi `loading`, teks `Memuat dari [layanan]…`, dan benang progres berganti;
4. setelah durasi simulasi, status menjadi `playing` atau `failed`;
5. gagal menampilkan notifikasi dan melanjutkan ke item berikutnya.

Sediakan kontrol simulasi handoff agar reviewer dapat melihat state sukses dan gagal tanpa menunggu lagu selesai.

### Connections

Daftar baris Apple Music, Spotify, YouTube, TIDAL, dan SoundCloud. Setiap baris menampilkan status, capability, dan aksi sesuai mock state. Aksi koneksi mengubah state lokal saja dan diberi label demo.

## Struktur komponen yang diharapkan

- `AppShell`
- `Sidebar`
- `TopBar/SearchInput`
- `SearchView`
- `TrackRow`
- `QueuePanel`
- `PlayerBar`
- `NowPlayingView`
- `ConnectionsView`
- `ToastRegion`
- `KeyboardShortcutsDialog`
- `ProviderBadge`
- `ThreadProgress`

Komponen boleh digabung bila implementasi kecil, tetapi state playback dan queue tidak boleh disembunyikan dalam komponen presentasi.

## Visual

Ikuti token DESIGN.md:

- light: `#F1F2F6`, ink `#1B1838`, accent `#F2B63C`;
- dark: `#15122B`, ink `#EFEDFA`;
- no shadows;
- service thread only on track rows, progress, and handoff;
- radius 4/6/14 sesuai komponen;
- sentence case;
- copy Bahasa Indonesia.

## Accessibility

- Semantic buttons and landmarks.
- `aria-label` provider badge memakai nama layanan.
- Player region berlabel `Pemutar`.
- Progress memakai slider semantics dan `aria-valuetext`.
- Handoff/toast memakai `aria-live="polite"`.
- Focus-visible ring.
- Keyboard: Space, arrows, Shift+arrows, `/`, `Q`, `?`; jangan mengambil alih saat fokus input.
- `prefers-reduced-motion` menonaktifkan loop/transisi.
- `dir="auto"` pada title dan artist.

## Verification

- Jalankan install/build/test/lint yang tersedia.
- Uji desktop dan viewport mobile secara manual.
- Uji keyboard utama.
- Verifikasi tidak ada token/provider credential.
- Review diff dan cek design checklist dari DESIGN.md.

## Open builder calls

- Nama produk tetap `Unison` sebagai nama sementara.
- Playback adalah simulasi eksplisit, bukan integrasi audio.
- Provider awal memakai Apple Music, Spotify, TIDAL, YouTube, SoundCloud sebagai mock data.
- Detail library/playlist hanya ditampilkan secukupnya untuk navigasi prototype.
