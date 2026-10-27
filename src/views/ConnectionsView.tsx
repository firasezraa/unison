import { useUnison } from '../app/UnisonContext'
import { PROVIDERS } from '../data/providers'
import type { ProviderStatus } from '../domain/types'
import { WarningIcon } from '../icons'

const STATUS_LABEL: Record<ProviderStatus, string> = {
  connected: 'Terhubung',
  'needs-reconnect': 'Perlu sambung ulang',
  disconnected: 'Belum terhubung',
}

const ACTION_LABEL: Record<ProviderStatus, string> = {
  connected: 'Putuskan',
  'needs-reconnect': 'Sambungkan ulang',
  disconnected: 'Hubungkan',
}

export function ConnectionsView() {
  const { providers, setProviderStatus, notify } = useUnison()

  const handle = (id: (typeof providers)[number]['id'], status: ProviderStatus) => {
    const name = PROVIDERS[id].name
    if (status === 'connected') {
      setProviderStatus(id, 'disconnected')
      notify(`${name} diputuskan.`)
      return
    }
    if (status === 'needs-reconnect') {
      setProviderStatus(id, 'connected')
      notify(`${name} terhubung.`)
      return
    }
    setProviderStatus(id, 'connected')
    notify(`${name} terhubung.`)
  }

  return (
    <div className="view">
      <header className="view__header">
        <h1 className="view__title">Koneksi</h1>
        <p className="view__lede">
          Layanan yang terhubung menentukan apa yang bisa dicari dan diputar. Setiap layanan punya syarat dan
          kemampuan yang berbeda.
        </p>
      </header>

      <ul className="connection-list">
        {providers.map((provider) => {
          const meta = PROVIDERS[provider.id]
          return (
            <li className="connection-row" key={provider.id} data-provider={provider.id}>
              <span className="connection-row__mark" aria-hidden="true" />
              <span>
                <span className="connection-row__name">{provider.name}</span>
                <span
                  className={
                    provider.status === 'needs-reconnect'
                      ? 'connection-row__status connection-row__status--warn'
                      : 'connection-row__status'
                  }
                  style={{ display: 'block' }}
                >
                  {provider.status === 'needs-reconnect' && <WarningIcon style={{ width: 12, height: 12 }} />}{' '}
                  {STATUS_LABEL[provider.status]} · {meta.code}
                </span>
              </span>
              <span className="connection-row__detail">
                {meta.requirement} {meta.summary}
              </span>
              <button
                type="button"
                className={provider.status === 'connected' ? 'btn btn--secondary' : 'btn btn--primary'}
                onClick={() => handle(provider.id, provider.status)}
              >
                {ACTION_LABEL[provider.status]}
              </button>
            </li>
          )
        })}
      </ul>

      <p className="callout">
        Ini prototipe. Koneksi hanya disimulasikan dan tidak ada akun yang benar-benar terhubung. Saat layanan
        disimulasikan terputus, lagu dari layanan itu tetap tampil di antrean dengan penanda.
      </p>
    </div>
  )
}
