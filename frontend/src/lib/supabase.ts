import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const isMisconfigured = !supabaseUrl || !supabaseAnonKey

if (isMisconfigured) {
  console.warn(
    '[RentalEval] Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).\n' +
    'Auth will be disabled until these are set. Copy frontend/.env.example → frontend/.env and fill in your values.'
  )
}

// When env vars are missing, return a stub that silently no-ops all auth calls
// so the app loads and guest mode still works.
function createStubClient(): SupabaseClient {
  const noop = async () => ({ data: { user: null, session: null }, error: null })
  const stub = {
    auth: {
      getSession: noop,
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' } }),
      signOut: noop,
      onAuthStateChange: (_event: unknown, _cb: unknown) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  }
  return stub as unknown as SupabaseClient
}

export const supabase: SupabaseClient = isMisconfigured
  ? createStubClient()
  : createClient(supabaseUrl, supabaseAnonKey)

/** True when Supabase is properly configured — use to conditionally show auth UI */
export const supabaseEnabled = !isMisconfigured
