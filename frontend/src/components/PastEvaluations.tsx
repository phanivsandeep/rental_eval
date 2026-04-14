import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, MapPin, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreBadge } from '@/components/ScoreBadge'
import { getReports, deleteReport } from '@/lib/api'
import { useAppStore } from '@/store'
import { toast } from 'sonner'
import type { Evaluation, EvaluationStatus } from '@/types'

const STATUS_BADGE: Record<EvaluationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  running: { label: 'Running', variant: 'secondary' },
  complete: { label: 'Complete', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export function PastEvaluations() {
  const navigate = useNavigate()
  const { history, setHistory, removeFromHistory } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReports()
      .then((res) => setHistory(res.reports))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [setHistory])

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    try {
      await deleteReport(id)
      removeFromHistory(id)
      toast.success('Evaluation deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No evaluations yet</p>
        <p className="text-sm text-muted-foreground mt-1">Evaluate your first property to see it here.</p>
        <Button className="mt-4" onClick={() => navigate('/evaluate')}>Evaluate a Property</Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((ev: Omit<Evaluation, 'report'>) => {
        const statusMeta = STATUS_BADGE[ev.status]
        return (
          <Card
            key={ev.id}
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => navigate(`/reports/${ev.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{ev.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(ev.created_at).toLocaleDateString()}</span>
                    <Badge variant={statusMeta.variant} className="text-xs py-0">{statusMeta.label}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ev.overall_score != null && <ScoreBadge score={ev.overall_score} size="sm" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(e, ev.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
