import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportView } from '@/components/ReportView'
import { getReport } from '@/lib/api'
import { toast } from 'sonner'
import type { EvaluationResponse } from '@/types'

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<EvaluationResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getReport(id)
      .then(setData)
      .catch(() => {
        toast.error('Failed to load report')
        navigate('/history')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/history')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> History
      </Button>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      )}

      {data?.report && id && (
        <ReportView report={data.report} address={data.address} evaluationId={id} />
      )}
    </div>
  )
}
