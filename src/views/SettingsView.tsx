import { useUnison } from '../app/UnisonContext'
import { PROVIDERS } from '../data/providers'
import { ChevronDownIcon, ChevronUpIcon } from '../icons'

export function SettingsView() {
  const { theme, setTheme, priority, setPriority, notify } = useUnison()

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= priority.length) return
    const next = [...priority]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setPriority(next)
  }

  const clearLocal = () => {
    try {
      window.localStorage.removeItem('unison.priority')
      window.localStorage.removeItem('unison.demoFail')
      window.localStorage.removeItem('unison.theme')
    } catch {
      /* diabaikan */
    }
    notify('Data lokal dihapus.')
  }

  return (
    <div className="view">
      <header className="view__header">
        <h1 className="view__title">Pengaturan</h1>
        <p className="view__lede">Tampilan, bahasa, urutan layanan, dan data yang disimpan prototipe ini.</p>
      </header>

      <section className="settings-group">
        <h2 className="settings-group__title">Tampilan</h2>
        <div className="settings-field">
          <span className="settings-field__label">Tema</span>
          <div className="radio-row" role="radiogroup" aria-label="Tema">
            {(['light', 'dark', 'system'] as const).map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="theme"
                  value={option}
                  checked={theme === option}
                  onChange={() => setTheme(option)}
                />
                {option === 'light' ? 'Terang' : option === 'dark' ? 'Gelap' : 'Ikuti sistem'}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">Bahasa</h2>
        <div className="settings-field">
          <span className="settings-field__label">Bahasa antarmuka</span>
          <div className="radio-row">
            <label>
              <input type="radio" name="locale" defaultChecked /> Indonesia
            </label>
            <label>
              <input type="radio" name="locale" disabled /> English
            </label>
          </div>
        </div>
        <p className="view__lede">Inggris belum tersedia di prototipe.</p>
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">Prioritas layanan</h2>
        <p className="view__lede">
          Urutan ini menentukan layanan mana yang dicari lebih dulu. Di versi berikutnya, urutan ini juga memilih
          sumber saat satu lagu tersedia di beberapa layanan.
        </p>
        <ol className="priority-list">
          {priority.map((id, index) => (
            <li className="priority-item" key={id}>
              <span className="priority-item__rank tabular" aria-hidden="true">
                {index + 1}
              </span>
              <span className="badge" data-provider={id}>
                {PROVIDERS[id].code}
              </span>
              <span className="priority-item__name">
                {PROVIDERS[id].name}
                {index === 0 && <span className="priority-item__hint"> · paling diutamakan</span>}
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Naikkan ${PROVIDERS[id].name}`}
              >
                <ChevronUpIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => move(index, 1)}
                disabled={index === priority.length - 1}
                aria-label={`Turunkan ${PROVIDERS[id].name}`}
              >
                <ChevronDownIcon />
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">Privasi &amp; data</h2>
        <p className="view__lede">
          Prototipe ini hanya menyimpan tiga hal di perangkatmu: pilihan tema, urutan prioritas layanan, dan sakelar
          demo handoff. Tidak ada akun, token, atau riwayat dengar yang dikirim ke mana pun.
        </p>
        <div className="view__actions">
          <button type="button" className="btn btn--danger" onClick={clearLocal}>
            Hapus data lokal
          </button>
        </div>
      </section>
    </div>
  )
}
