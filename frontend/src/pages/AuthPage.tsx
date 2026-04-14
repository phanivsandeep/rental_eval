import { useState } from 'react'
import { Building2, ShieldCheck, Zap, Users, LogIn, UserPlus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { toast } from 'sonner'

const FEATURES = [
  { icon: <Zap className="h-4 w-4 text-amber-500" />, text: '8 AI agents evaluate in parallel — results in under 45 seconds' },
  { icon: <Users className="h-4 w-4 text-blue-500" />, text: 'Scores personalized to your lifestyle, culture, and priorities' },
  { icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />, text: 'Your API key is encrypted — never stored in any database' },
]

export default function AuthPage() {
  const { setUser, setIsGuest } = useAppStore()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setUser(data.user)
    toast.success('Welcome back!')
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    if (data.user && !data.user.email_confirmed_at) {
      toast.success('Account created! Check your email to confirm.')
    } else if (data.user) {
      setUser(data.user)
      toast.success('Account created!')
    }
  }

  function handleGuest() {
    setIsGuest(true)
    toast.info('Guest mode — nothing will be saved this session.')
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ──────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight">RentalEval</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight">
              Find your perfect rental — before you sign.
            </h1>
            <p className="text-primary-foreground/70 text-lg">
              AI agents evaluate any address across 8 dimensions, personalized to who you are.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 bg-primary-foreground/10 rounded-md p-1.5">
                  {f.icon}
                </div>
                <p className="text-sm text-primary-foreground/80">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-3 text-sm">
            {['🛡️ Safety', '🚌 Transit', '🛒 Food', '🏃 Lifestyle',
              '🏥 Services', '💡 Utilities', '🏠 Building', '📈 Future Risk'].map((item) => (
              <div
                key={item}
                className="rounded-lg bg-primary-foreground/10 px-2 py-2 text-center text-xs text-primary-foreground/80"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/40">
          Powered by Claude (Anthropic) · Your key, your control
        </p>
      </div>

      {/* ── Right panel — auth form ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">RentalEval</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Get started</h2>
            <p className="text-sm text-muted-foreground">Sign in or create an account to save your evaluations.</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup')}>
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                <LogIn className="h-3.5 w-3.5 mr-1.5" /> Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Create Account
              </TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Account'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Guest */}
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={handleGuest}>
              Continue as Guest
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Guest mode is fully functional — your profile and evaluations exist for this session only. Nothing is saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
