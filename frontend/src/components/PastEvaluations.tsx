import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, MapPin, ChevronRight, SlidersHorizontal, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScoreBadge } from '@/components/ScoreBadge'
import { getReports, deleteReport } from '@/lib/api'
import { useAppStore } from '@/store'
import { toast } from 'sonner'
import type { Evaluation, EvaluationStatus, UserProfile } from '@/types'

const DIMENSION_LABELS: Record<string, string> = {
  safety:         '🛡️ Safety',
  transportation: '🚌 Transit',
  food:           '🛒 Food',
  lifestyle:      '🏃 Lifestyle',
  convenience:    '🏥 Services',
  utilities:      '💡 Utilities',
  building:       '🏠 Building',
  future_risk:    '📈 Future Risk',
}

const STATUS_BADGE: Record<EvaluationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:  { label: 'Pending',  variant: 'outline' },
  running:  { label: 'Running',  variant: 'secondary' },
  complete: { label: 'Complete', variant: 'default' },
  failed:   { label: 'Failed',   variant: 'destructive' },
}

// ── Preferences modal ─────────────────────────────────────────────────────────

function PreferencesModal({
  evaluation,
  onClose,
  onViewReport,
}: {
  evaluation: Omit<Evaluation, 'report'>
  onClose: () => void
  onViewReport: () => void
}) {
  const p: UserProfile | undefined = evaluation.profile_snapshot

  return (
    <Dialog open onOpenChange={(open: boolean) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{evaluation.address}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {new Date(evaluation.created_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
            {evaluation.overall_score != null && (
              <span className="ml-2">
                · Overall match: <strong>{evaluation.overall_score}/100</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {p ? (
          <div className="space-y-4 text-sm">
            {/* Anonymous header — no email or name */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="h-4 w-4" />
              <span className="text-xs">Preferences used for this evaluation</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {p.household      && <Row label="Household"  value={p.household} />}
              {p.transportation && <Row label="Transport"  value={p.transportation} />}
              {p.work_schedule  && <Row label="Schedule"   value={p.work_schedule} />}
              {p.exercise_routine && <Row label="Exercise" value={p.exercise_routine} />}
              {p.budget         && <Row label="Budget"     value={`$${p.budget.toLocaleString()}/mo`} />}
              <Row label="Pets" value={p.has_pets ? (p.pet_type ?? 'yes') : 'no'} />
            </div>

            {p.food_preferences?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Food preferences</p>
                <div className="flex flex-wrap gap-1">
                  {p.food_preferences.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
            )}

            {p.priorities?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Priority order</p>
                <ol className="space-y-1">
                  {p.priorities.map((dim, i) => (
                    <li key={dim} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-4 text-right">{i + 1}.</span>
                      <span>{DIMENSION_LABELS[dim] ?? dim}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No preference snapshot available.</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1" onClick={onViewReport}>View Report</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value.replace(/_/g, ' ')}</span>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PastEvaluations() {
  const navigate  = useNavigate()
  const { history, setHistory, removeFromHistory, isGuest } = useAppStore()
  const [loading,  setLoading]  = useState(!isGuest)   // guests already have in-memory history
  const [selected, setSelected] = useState<Omit<Evaluation, 'report'> | null>(null)

  useEffect(() => {
    if (isGuest) return   // guest history lives in the store; no API call needed
    getReports()
      .then((res) => setHistory(res.reports))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [isGuest, setHistory])

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (isGuest) {
      removeFromHistory(id)
      return
    }
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
        <p className="text-sm text-muted-foreground mt-1">
          Evaluate your first property to see it here.
        </p>
        <Button className="mt-4" onClick={() => navigate('/evaluate')}>
          Evaluate a Property
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {history.map((ev: Omit<Evaluation, 'report'>) => {
          const statusMeta = STATUS_BADGE[ev.status]
          return (
            <Card
              key={ev.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelected(ev)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      {/* Address shown — no user name / email */}
                      <span className="text-sm font-medium truncate">{ev.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(ev.created_at).toLocaleDateString()}</span>
                      <Badge variant={statusMeta.variant} className="text-xs py-0">
                        {statusMeta.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ev.overall_score != null && (
                      <ScoreBadge score={ev.overall_score} size="sm" />
                    )}
                    {ev.profile_snapshot && (
                      <button
                        title="View preferences"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelected(ev) }}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    )}
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

      {selected && (
        <PreferencesModal
          evaluation={selected}
          onClose={() => setSelected(null)}
          onViewReport={() => {
            setSelected(null)
            navigate(`/reports/${selected.id}`)
          }}
        />
      )}
    </>
  )
}
