import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { saveApiKey } from '@/lib/api'
import { useAppStore } from '@/store'

export function ApiKeyPrompt() {
  const setHasApiKey = useAppStore((s) => s.setHasApiKey)
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key.startsWith('sk-ant-')) {
      setError('Key must start with sk-ant-')
      return
    }
    setLoading(true)
    setError('')
    try {
      await saveApiKey(key)
      setHasApiKey(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Enter your Anthropic API Key</CardTitle>
          <CardDescription>
            This app uses Claude to power the property evaluation. Your key is
            encrypted and stored only in a secure httpOnly cookie — never in any
            database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Anthropic API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-ant-..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                required
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : 'Save Key & Continue'}
            </Button>
          </form>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span>
              Your key is encrypted with AES-256 before being stored in a
              httpOnly cookie. It is never logged, never stored in the database,
              and only used for the duration of each evaluation request.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
