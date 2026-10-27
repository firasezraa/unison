// Klien Supabase untuk frontend.
// Memakai publishable key (aman berada di klien — memang untuk browser).
// service_role key TIDAK pernah dipakai di sini.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://cliujpbiecvbskxiyxny.supabase.co'
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_qFvB7YLy6rAQyRpA7y6hEA_Q1a9c6dW'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
