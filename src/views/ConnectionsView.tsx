import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useUnison } from '../app/UnisonContext'
import { routeToHash } from '../app/useHashRoute'
import {
  CAPABILITIES,
  PROVIDER_CODES,
  PROVIDER_NAMES,
  PROVIDER_REQUIREMENTS,
} from '../integration/capabilities'
import { disconnectProvider, fetchProviderStatus, startProviderAuth } from '../integration/oauth'
import type { ProviderAccount, ProviderId } from '../integration/types'
import { WarningIcon } from '../icons'

const ALL_PROVIDERS: ProviderId[] = ['spotify', 'apple', 'tidal', 'youtube', 'soundcloud']

export function ConnectionsView() {
  const { session, user } = useAuth()
  const { notify } = useUnison()
  const [accounts, setAccounts] = useState<ProviderAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [busyProvider, setBusyProvider] = useState<ProviderId | null>(null)

  const load = async () => {
    if (!session) return
    setLoading(true)
    try {
      setAccounts(await fetchProviderStatus(session.access_token))
    } catch (error) {
      notify((error as Error).message ?? 'Gagal membaca status koneksi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Tangani redirect balik dari oauth-callback: #/koneksi?status=connected&provider=…
  useEffect(() => {
    const query = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : ''
    const params = new URLSearchParams(query)
    const status = params.get('status')
    const provider = params.get('provider')
    if (!status) return

    const name = provider ? (PROVIDER_NAMES[provider as ProviderId] ?? 'Layanan') : 'Layanan'
    if (status === 'connected') notify(`${name} terhubung.`)
    else if (status === 'denied') notify('Otorisasi ditolak. Tidak ada perubahan.')
    else if (status === 'not_configured') notify(`${name} belum dikonfigurasi. Isi kredensial di Edge Function dulu.`)
    else if (status === 'token_failed') notify(`${name} menolak token. Coba lagi.`)
    else notify('Gagal menghubungkan layanan. Coba lagi.')

    window.history.replaceState(null, '', '#/koneksi')
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = async (provider: ProviderId) => {
    if (!session) return
    setBusyProvider(provider)
    const result = await startProviderAuth(session.access_token, provider)
    setBusyProvider(null)
    if (result.error) {
      notify(result.error)
      return
    }
    if (result.authorizationUrl) window.location.href = result.authorizationUrl
  }

  const disconnect = async (provider: ProviderId) => {
    if (!session) return
    setBusyProvider(provider)
    try {
      await disconnectProvider(session.access_token, provider)
      notify(`${PROVIDER_NAMES[provider]} diputuskan.`)
      await load()
    } catch (error) {
      notify((error as Error).message ?? 'Gagal memutuskan layanan.')
    } finally {
      setBusyProvider(null)
    }
  }

  const accountOf = (id: ProviderId) => accounts.find((item) => item.provider === id)

  if (!session) {
    return (
      <div className="view">
        <header className="view__header">
          <h1 className="view__title">Koneksi</h1>
          <p className="view__lede">Masuk untuk menghubungkan layanan musikmu.</p>
        </header>
        <div className="empty-state">
          <p className="empty-state__text">
            Setelah masuk, kamu bisa menghubungkan Spotify, Apple Music, dan lainnya. Token disimpan
            terenkripsi di server — tidak pernah sampai ke perangkatmu.
          </p>
          <a className="btn btn--primary" href={routeToHash({ name: 'masuk' })}>
            Masuk
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <header className="view__header">
        <h1 className="view__title">Koneksi</h1>
        <p className="view__lede">
          Layanan yang terhubung menentukan apa yang bisa dicari dan diputar.
          {user?.email ? ` Masuk sebagai ${user.email}.` : ''}
        </p>
      </header>

      {loading && accounts.length === 0 ? (
        <p className="result-status">
          <span className="pulse-dot" aria-hidden="true" />
          Memuat status koneksi…
        </p>
      ) : (
        <ul className="connection-list">
          {ALL_PROVIDERS.map((provider) => {
            const account = accountOf(provider)
            const connected = account?.status === 'active'
            const needsReconnect = account?.status === 'needs-reconnect'
            const configured = account?.configured ?? false
            const capability = CAPABILITIES[provider]
            return (
              <li className="connection-row" key={provider} data-provider={provider}>
                <span className="connection-row__mark" aria-hidden="true" />
                <span>
                  <span className="connection-row__name">{PROVIDER_NAMES[provider]}</span>
                  <span
                    className={
                      needsReconnect
                        ? 'connection-row__status connection-row__status--warn'
                        : 'connection-row__status'
                    }
                    style={{ display: 'block' }}
                  >
                    {needsReconnect && <WarningIcon style={{ width: 12, height: 12 }} />}{' '}
                    {connected ? 'Terhubung' : needsReconnect ? 'Perlu sambung ulang' : 'Belum terhubung'}{' '}
                    · {PROVIDER_CODES[provider]}
                  </span>
                </span>
                <span className="connection-row__detail">
                  {PROVIDER_REQUIREMENTS[provider]}
                  {capability.playback ? ' Bisa diputar.' : ' Playback belum tersedia di web.'}
                  {!configured && ' Kredensial belum diisi.'}
                </span>
                {connected ? (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => disconnect(provider)}
                    disabled={busyProvider === provider}
                  >
                    {busyProvider === provider ? 'Memproses…' : 'Putuskan'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => connect(provider)}
                    disabled={busyProvider === provider}
                  >
                    {busyProvider === provider ? 'Memproses…' : needsReconnect ? 'Sambungkan ulang' : 'Hubungkan'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="callout">
        Ini koneksi sungguhan. Token layanan dienkripsi di server dan tidak pernah dikirim ke perangkatmu.
      </p>
    </div>
  )
}
