import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScoreBadge } from '@/components/ScoreBadge'
import type { AgentsState, EvaluationDimension, AgentStatus } from '@/types'

const DIMENSION_LABELS: Record<EvaluationDimension, string> = {
  safety: 'Safety',
  transportation: 'Transportation',
  food: 'Food & Grocery',
  lifestyle: 'Lifestyle & Wellness',
  convenience: 'Convenience & Services',
  utilities: 'Utilities & Cost',
  building: 'Building & Landlord',
  future_risk: 'Future Risk',
}

const DIMENSION_ICONS: Record<EvaluationDimension, string> = {
  safety: '🛡️',
  transportation: '🚌',
  food: '🛒',
  lifestyle: '🏃',
  convenience: '🏥',
  utilities: '💡',
  building: '🏠',
  future_risk: '📈',
}

const ALL_DIMENSIONS: EvaluationDimension[] = [
  'safety', 'transportation', 'food', 'lifestyle',
  'convenience', 'utilities', 'building', 'future_risk',
]

interface AgentProgressProps {
  agents: AgentsState
  address: string
}

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
  if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />
  return <Clock className="h-4 w-4 text-muted-foreground" />
}

export function AgentProgress({ agents, address }: AgentProgressProps) {
  const completed = ALL_DIMENSIONS.filter((d) => agents[d].status === 'complete' || agents[d].status === 'failed').length
  const progress = Math.round((completed / ALL_DIMENSIONS.length) * 100)

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Evaluating <span className="font-medium text-foreground">{address}</span></span>
          <span className="text-muted-foreground">{completed} / {ALL_DIMENSIONS.length} agents</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ALL_DIMENSIONS.map((dim) => {
          const state = agents[dim]
          return (
            <Card
              key={dim}
              className={
                state.status === 'running'
                  ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20'
                  : state.status === 'complete'
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                  : state.status === 'failed'
                  ? 'border-destructive/30 bg-destructive/5'
                  : ''
              }
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0 mt-0.5">{DIMENSION_ICONS[dim]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{DIMENSION_LABELS[dim]}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {state.status === 'complete' && state.score != null && (
                          <ScoreBadge score={state.score} size="sm" />
                        )}
                        <StatusIcon status={state.status} />
                      </div>
                    </div>
                    {state.summary && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{state.summary}</p>
                    )}
                    {state.status === 'idle' && (
                      <p className="text-xs text-muted-foreground mt-0.5">Waiting…</p>
                    )}
                    {state.status === 'running' && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Analyzing…</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
