import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PastEvaluations } from '@/components/PastEvaluations'

export default function HistoryPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Evaluation History</h1>
          <p className="text-sm text-muted-foreground">All your past property evaluations.</p>
        </div>
      </div>
      <PastEvaluations />
    </div>
  )
}
