import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiKeyPrompt } from '@/components/ApiKeyPrompt'
import { useAppStore } from '@/store'

export default function Home() {
  const navigate = useNavigate()
  const { hasApiKey, profile } = useAppStore()

  // Once fully set up, go straight to evaluate
  useEffect(() => {
    if (hasApiKey && profile) navigate('/evaluate', { replace: true })
  }, [hasApiKey, profile, navigate])

  // Need API key first
  if (!hasApiKey) return <ApiKeyPrompt />

  // Has key but no profile yet
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Building2 className="h-8 w-8 text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to RentalEval</h1>
        <p className="text-muted-foreground max-w-md">
          Set up your profile so agents can personalize every evaluation for you.
        </p>
      </div>

      <Button size="lg" onClick={() => navigate('/profile')}>
        Set Up My Profile
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground max-w-lg">
        {['🛡️ Safety', '🚌 Transit', '🛒 Food', '🏃 Lifestyle',
          '🏥 Services', '💡 Utilities', '🏠 Building', '📈 Future'].map((item) => (
          <div key={item} className="border rounded-lg py-2 px-3">{item}</div>
        ))}
      </div>
    </div>
  )
}
