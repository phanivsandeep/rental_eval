import { useState } from 'react'
import { Share2, CheckCircle2, AlertTriangle, XOctagon, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScoreBadge } from '@/components/ScoreBadge'
import { DimensionCard } from '@/components/DimensionCard'
import { CostBreakdown } from '@/components/CostBreakdown'
import { toast } from 'sonner'
import type { Report, EvaluationDimension } from '@/types'

const ALL_DIMENSIONS: EvaluationDimension[] = [
  'safety', 'transportation', 'food', 'lifestyle',
  'convenience', 'utilities', 'building', 'future_risk',
]

interface ReportViewProps {
  report: Report
  address: string
  evaluationId: string
}

export function ReportView({ report, address, evaluationId }: ReportViewProps) {
  const [copied, setCopied] = useState(false)

  function handleShare() {
    const url = `${window.location.origin}/reports/${evaluationId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success('Report link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{address}</span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Overall Score</h2>
            <ScoreBadge score={report.overall_score} size="lg" />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          {copied ? 'Copied!' : 'Share'}
        </Button>
      </div>

      {/* Persona Narrative */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {report.persona_narrative}
          </p>
        </CardContent>
      </Card>

      {/* Pros / Cons / Red Flags */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Pros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {report.pros.map((pro, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-emerald-500 flex-shrink-0">+</span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Cons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {report.cons.map((con, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-amber-500 flex-shrink-0">−</span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={report.red_flags.length > 0 ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <XOctagon className="h-4 w-4" /> Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.red_flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">None found</p>
            ) : (
              <ul className="space-y-1.5">
                {report.red_flags.map((flag, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-destructive flex-shrink-0">!</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <CostBreakdown costs={report.monthly_cost_estimate} />

      <Separator />

      {/* Dimension Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Detailed Evaluation</h3>
        <div className="space-y-2">
          {ALL_DIMENSIONS.filter((d) => d in report.sections).map((dim) => (
            <DimensionCard key={dim} dimension={dim} result={report.sections[dim]} />
          ))}
        </div>
      </div>
    </div>
  )
}
