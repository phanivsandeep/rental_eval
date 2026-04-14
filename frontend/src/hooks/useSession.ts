import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createSession, getProfile } from '@/lib/api'
import { useAppStore } from '@/store'

/**
 * Bootstraps Supabase auth state on mount, then syncs backend session + profile
 * for logged-in users. Guests skip all backend syncing.
 */
export function useSession() {
  const { setUser, setAuthLoading, setSessionId, setProfile, setHasApiKey, user, isGuest } =
    useAppStore()

  // Resolve initial Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      // If no session found, authLoading must still be cleared
      if (!data.session) setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else if (!isGuest) {
        setAuthLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When a real user is set, sync their backend session + saved profile
  useEffect(() => {
    if (!user) return

    async function syncBackend() {
      try {
        const { session_id } = await createSession()
        setSessionId(session_id)
      } catch {
        // Cookie already set
      }
      try {
        const res = await getProfile()
        if (res.profile && Object.keys(res.profile).length > 0) {
          setProfile(res.profile)
          setHasApiKey(true)
        }
      } catch {
        // No profile yet — user will be prompted
      }
    }

    syncBackend()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
}
