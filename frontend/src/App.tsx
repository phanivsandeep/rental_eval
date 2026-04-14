import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { Building2, History, Settings, LogOut, UserCircle } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSession } from '@/hooks/useSession'
import { useAppStore } from '@/store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

import AuthPage from '@/pages/AuthPage'
import Home from '@/pages/Home'
import ProfilePage from '@/pages/Profile'
import EvaluatePage from '@/pages/Evaluate'
import HistoryPage from '@/pages/History'
import ReportDetailPage from '@/pages/ReportDetail'

// ─── Nav bar ──────────────────────────────────────────────────────────────────

function Nav() {
  const navigate = useNavigate()
  const { user, isGuest, signOut } = useAppStore()

  async function handleSignOut() {
    await supabase.auth.signOut()
    signOut()
    toast.success('Signed out')
    navigate('/', { replace: true })
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 font-semibold text-sm">
          <Building2 className="h-5 w-5 text-primary" />
          RentalEval
          {isGuest && (
            <Badge variant="outline" className="text-xs ml-1">Guest</Badge>
          )}
        </NavLink>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink to="/evaluate" className={navClass}>Evaluate</NavLink>

          {user && (
            <NavLink to="/history" className={navClass}>
              <History className="h-3.5 w-3.5 mr-1" />History
            </NavLink>
          )}

          <NavLink to="/profile" className={navClass}>
            <Settings className="h-3.5 w-3.5" />
          </NavLink>

          {/* Auth state indicator */}
          {user ? (
            <div className="flex items-center gap-2 ml-1">
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <UserCircle className="h-3.5 w-3.5" />
                {user.email?.split('@')[0]}
              </span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleSignOut} title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : isGuest ? (
            <Button
              size="sm"
              variant="outline"
              className="ml-1 text-xs h-7"
              onClick={() => { signOut(); navigate('/', { replace: true }) }}
            >
              Sign in
            </Button>
          ) : null}
        </div>
      </div>
    </nav>
  )
}

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
    isActive
      ? 'bg-accent text-accent-foreground font-medium'
      : 'text-muted-foreground hover:text-foreground'
  }`
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function AppShell() {
  useSession()
  const { user, isGuest, authLoading } = useAppStore()
  const isAuthenticated = user !== null || isGuest

  // Show blank while Supabase resolves the initial session
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Building2 className="h-5 w-5 animate-pulse text-primary" />
          Loading…
        </div>
      </div>
    )
  }

  // Not authenticated → show the auth page (no nav)
  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <Toaster richColors position="bottom-right" />
      </>
    )
  }

  // Authenticated (user or guest) → full app
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/evaluate" element={<EvaluatePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
        </Routes>
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
