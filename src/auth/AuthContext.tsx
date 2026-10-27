import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../integration/supabase'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthResult {
  error?: string
  /** True bila akun terdaftar tapi butuh konfirmasi email (belum ada sesi). */
  needsConfirmation?: boolean
}

export interface AuthValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  sendMagicLink: (email: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: translateError(error.message) }
    return {}
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: translateError(error.message) }
    if (!data.session) return { needsConfirmation: true }
    return {}
  }, [])

  const sendMagicLink = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/#/masuk` },
    })
    if (error) return { error: translateError(error.message) }
    return {}
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        sendMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}

/** Petakan galat Supabase Auth ke bahasa Indonesia yang jujur + langkah berikutnya. */
function translateError(message: string): string {
  const lowered = message.toLowerCase()
  if (lowered.includes('invalid login credentials')) return 'Email atau kata sandi salah. Coba lagi.'
  if (lowered.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masukmu dan klik tautannya.'
  if (lowered.includes('already registered')) return 'Email ini sudah terdaftar. Coba masuk.'
  if (lowered.includes('password should be at least')) return 'Kata sandi terlalu pendek. Minimal 6 karakter.'
  if (lowered.includes('email') && lowered.includes('rate limit')) return 'Batas kirim email sementara tercapai. Coba lagi dalam beberapa menit.'
  if (lowered.includes('rate limit')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  if (lowered.includes('not a valid email')) return 'Alamat email tidak valid.'
  if (lowered.includes('is invalid') || lowered.includes('email_address_invalid')) return 'Alamat email tidak valid. Periksa kembali penulisannya.'
  return 'Terjadi kesalahan. Coba lagi.'
}
