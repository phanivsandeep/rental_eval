import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const isMisconfigured = !supabaseUrl || !supabaseAnonKey

if (isMisconfigured) {
  console.warn(
    '[TenantFit] Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).\n' +
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

// Custom lock that avoids navigator.locks — prevents the "apps on device"
// permission prompt Chrome shows when navigator.locks.request() is called.
// Tradeoff: cross-tab session sync is disabled (logging in on one tab won't
// auto-reflect in another), which is acceptable for this app.
async function noOpLock<T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> {
  return fn()
}

export const supabase: SupabaseClient = isMisconfigured
  ? createStubClient()
  : createClient(supabaseUrl, supabaseAnonKey, { auth: { lock: noOpLock } })

/** True when Supabase is properly configured — use to conditionally show auth UI */
export const supabaseEnabled = !isMisconfigured
