import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { routeToHash } from '../app/useHashRoute'

type Mode = 'masuk' | 'daftar'

export function AuthView({ initialMode = 'masuk' }: { initialMode?: Mode }) {
  const { session, signIn, signUp, sendMagicLink } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (session) window.location.hash = routeToHash({ name: 'beranda' })
  }, [session])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    const result = mode === 'masuk' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (result.error) setMessage({ kind: 'error', text: result.error })
    else if (result.needsConfirmation)
      setMessage({
        kind: 'info',
        text: 'Cek email kamu untuk mengonfirmasi akun, lalu masuk kembali.',
      })
  }

  const onMagicLink = async () => {
    setBusy(true)
    setMessage(null)
    const result = await sendMagicLink(email)
    setBusy(false)
    if (result.error) setMessage({ kind: 'error', text: result.error })
    else setMessage({ kind: 'info', text: 'Cek email kamu. Kami kirim tautan untuk masuk.' })
  }

  const switchMode = () => {
    setMode((prev) => (prev === 'masuk' ? 'daftar' : 'masuk'))
    setMessage(null)
    setPassword('')
  }

  return (
    <div className="auth-view">
      <div className="auth-card">
        <h1 className="auth-card__title">
          {mode === 'masuk' ? 'Masuk ke Unison' : 'Buat akun Unison'}
        </h1>
        <p className="auth-card__lede">Hubungkan layanan musikmu dalam satu pemutar.</p>

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="kamu@contoh.com"
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Kata sandi</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 6 karakter"
            />
          </div>

          {message && (
            <p className={message.kind === 'error' ? 'auth-message auth-message--error' : 'auth-message'} role="status">
              {message.text}
            </p>
          )}

          <button type="submit" className="btn btn--primary auth-submit" disabled={busy || !email}>
            {busy ? 'Memproses…' : mode === 'masuk' ? 'Masuk' : 'Buat akun'}
          </button>
        </form>

        <div className="auth-divider">
          <span>atau</span>
        </div>

        <button type="button" className="btn btn--secondary auth-submit" onClick={onMagicLink} disabled={busy || !email}>
          Kirim tautan ajaib
        </button>

        <button type="button" className="btn btn--text auth-switch" onClick={switchMode}>
          {mode === 'masuk' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
      </div>
    </div>
  )
}
