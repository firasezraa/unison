import type { Playlist, ProviderId, Track } from '../domain/types'

const t = (
  id: string,
  provider: ProviderId,
  title: string,
  artist: string,
  album: string,
  durationMs: number,
  available = true,
): Track => ({ id, provider, title, artist, album, durationMs, artwork: null, available })

export const CATALOG: Track[] = [
  t('am-1', 'am', 'Hujan', 'Artis Satu', 'Ruang Tunggu', 222000),
  t('am-2', 'am', 'Perjalanan ke Bandung', 'Rani Melodi', 'Jalan Pulang', 258000),
  t('am-3', 'am', '夜に駆ける', 'YOASOBI', 'THE BOOK', 261000),
  t('am-4', 'am', 'Lagu yang Hilang', 'Nara', 'Arsip', 195000, false),
  t('sp-1', 'sp', 'Hujan', 'Artis Satu', 'Ruang Tunggu', 222000),
  t('sp-2', 'sp', 'Hujan di Bulan Juni', 'Kabut Pagi', 'Musim', 250000),
  t('sp-3', 'sp', 'Santai Sore', 'Duo Senja', 'Kedai', 231000),
  t('sp-4', 'sp', 'حب في المدينة', 'Layla', 'مدينة', 205000),
  t('td-1', 'td', 'Sunyi', 'Awan Timur', 'Ruang', 288000),
  t('td-2', 'td', 'Kota Tua', 'Bara', 'Bekas', 214000),
  t('yt-1', 'yt', 'Hujan Akustik', 'Kanal Random', 'Rekaman Rumah', 240000),
  t('yt-2', 'yt', 'Studio Session', 'Tiga Suara', 'Live', 312000),
  t('sc-1', 'sc', 'Hujan (Remix)', 'DJ Lokal', 'Bootleg', 228000),
  t('sc-2', 'sc', 'Demo Tape', 'Band Kecil', 'Rilisan Mandiri', 176000),
  t('am-5', 'am', 'Pagi yang Tenang', 'Sari', 'Rumah', 199000),
  t('sp-5', 'sp', 'Lampu Kota', 'Fajar', 'Malam', 244000),
]

export const EMPTY_ARTWORK_TRACK_ID = 'am-1'

export const PLAYLISTS: Playlist[] = [
  {
    id: 'perjalanan',
    name: 'Perjalanan',
    description: 'Campuran tiga layanan untuk didengar di jalan.',
    trackIds: ['am-1', 'sp-2', 'td-1', 'sp-3', 'am-2'],
  },
  {
    id: 'santai',
    name: 'Santai',
    description: 'Tempo lambat, tanpa kejutan.',
    trackIds: ['sp-3', 'am-5', 'sc-2'],
  },
  {
    id: 'malam',
    name: 'Malam',
    description: 'Untuk didengar setelah semua orang tidur.',
    trackIds: ['td-2', 'sp-5', 'am-3', 'td-1'],
  },
]

export function searchCatalog(provider: ProviderId, query: string): Track[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return CATALOG.filter(
    (track) =>
      track.provider === provider &&
      (track.title.toLowerCase().includes(q) || track.artist.toLowerCase().includes(q)),
  )
}

export function trackById(id: string): Track | undefined {
  return CATALOG.find((track) => track.id === id)
}
