import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProfileForm } from '@/components/ProfileForm'
import { useAppStore } from '@/store'
import { toast } from 'sonner'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile, user, isGuest } = useAppStore()

  function handleSaved() {
    toast.success(isGuest ? 'Profile set for this session.' : 'Profile saved!')
    navigate('/evaluate')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Your Profile</h1>
            {isGuest && <Badge variant="outline">Guest — not saved</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Agents use this to personalize every evaluation for you.
          </p>
        </div>
      </div>

      {user && (
        <p className="text-xs text-muted-foreground mb-4 bg-muted rounded-lg px-3 py-2">
          Signed in as <strong>{user.email}</strong> — your profile is saved and synced.
        </p>
      )}

      <ProfileForm initial={profile} onSaved={handleSaved} guestMode={isGuest} />
    </div>
  )
}
