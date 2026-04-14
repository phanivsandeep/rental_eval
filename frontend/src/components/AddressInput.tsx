import { useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddressInputProps {
  onSubmit: (address: string) => void
  loading?: boolean
}

export function AddressInput({ onSubmit, loading }: AddressInputProps) {
  const [address, setAddress] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = address.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label htmlFor="address" className="text-base font-semibold">
        Rental Property Address
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="address"
            className="pl-9"
            placeholder="456 Oak Street, San Jose, CA 95112"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <Button type="submit" disabled={loading || !address.trim()}>
          <Search className="h-4 w-4 mr-2" />
          {loading ? 'Evaluating…' : 'Evaluate'}
        </Button>
      </div>
    </form>
  )
}
