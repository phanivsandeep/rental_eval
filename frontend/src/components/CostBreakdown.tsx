import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { MonthlyCostEstimate } from '@/types'

interface CostBreakdownProps {
  costs: MonthlyCostEstimate
}

const COST_LABELS: { key: keyof MonthlyCostEstimate; label: string }[] = [
  { key: 'rent', label: 'Rent' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'gas', label: 'Gas / Heating' },
  { key: 'internet', label: 'Internet' },
  { key: 'transit_pass', label: 'Transit Pass' },
  { key: 'parking', label: 'Parking' },
  { key: 'renters_insurance', label: "Renter's Insurance" },
]

export function CostBreakdown({ costs }: CostBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Monthly Cost Estimate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {COST_LABELS.map(({ key, label }) => {
            const value = costs[key]
            if (value == null || value === 0) return null
            return (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">${(value as number).toLocaleString()}</span>
              </div>
            )
          })}
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total / month</span>
            <span className="font-mono text-primary">${costs.total_estimate.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
