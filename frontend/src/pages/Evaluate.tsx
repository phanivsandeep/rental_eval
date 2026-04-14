import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddressInput } from '@/components/AddressInput'
import { AgentProgress } from '@/components/AgentProgress'
import { ReportView } from '@/components/ReportView'
import { ApiKeyPrompt } from '@/components/ApiKeyPrompt'
import { useAppStore } from '@/store'
import { startEvaluation } from '@/lib/api'
import { toast } from 'sonner'

export default function EvaluatePage() {
  const navigate = useNavigate()
  const abortRef = useRef<(() => void) | null>(null)

  const {
    hasApiKey, profile,
    isEvaluating, evaluationAddress, evaluationId,
    agents, report, evaluationError,
    startEvaluation: storeStart,
    applyAgentUpdate, setReport, setEvaluationError, resetEvaluation,
  } = useAppStore()

  // Clean up SSE on unmount
  useEffect(() => () => { abortRef.current?.() }, [])

  if (!hasApiKey) return <ApiKeyPrompt />

  function handleSubmit(address: string) {
    abortRef.current?.()
    storeStart(address)

    abortRef.current = startEvaluation(address, {
      onStarted: (_id) => { /* evaluationId set on complete */ },
      onAgentUpdate: (event) => applyAgentUpdate(event),
      onComplete: (id, reportData) => {
        setReport(id, reportData)
        toast.success('Evaluation complete!')
      },
      onError: (msg) => {
        setEvaluationError(msg)
        toast.error(msg)
      },
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evaluate a Property</h1>
          {profile?.household && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Personalized for: {profile.household} · {profile.transportation} · {profile.work_schedule}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
          <Settings className="h-4 w-4 mr-2" /> Profile
        </Button>
      </div>

      {/* Address Input */}
      {!isEvaluating && !report && (
        <AddressInput onSubmit={handleSubmit} loading={isEvaluating} />
      )}

      {/* Error */}
      {evaluationError && !isEvaluating && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {evaluationError}
          <Button variant="link" size="sm" className="ml-2 text-destructive" onClick={resetEvaluation}>
            Try again
          </Button>
        </div>
      )}

      {/* Progress */}
      {isEvaluating && (
        <AgentProgress agents={agents} address={evaluationAddress} />
      )}

      {/* Report */}
      {report && evaluationId && (
        <>
          <ReportView report={report} address={evaluationAddress} evaluationId={evaluationId} />
          <Button variant="outline" onClick={resetEvaluation} className="w-full">
            Evaluate Another Property
          </Button>
        </>
      )}
    </div>
  )
}
