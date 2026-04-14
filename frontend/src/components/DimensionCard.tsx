import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { ScoreBadge } from '@/components/ScoreBadge'
import type { EvaluationDimension, DimensionResult } from '@/types'

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

interface DimensionCardProps {
  dimension: EvaluationDimension
  result: DimensionResult
}

export function DimensionCard({ dimension, result }: DimensionCardProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={dimension} className="border rounded-xl px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{DIMENSION_ICONS[dimension]}</span>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-semibold text-sm">{DIMENSION_LABELS[dimension]}</span>
                <ScoreBadge score={result.score} size="sm" />
              </div>
              <Progress value={result.score} className="h-1.5 w-full max-w-xs" />
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <p className="text-sm text-muted-foreground mb-3">{result.summary}</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{result.details}</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
