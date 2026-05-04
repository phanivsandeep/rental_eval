import { useEffect, useState } from 'react'
import { Loader2, WifiOff } from 'lucide-react'
import { waitForBackend, type BackendStatus } from '@/lib/api'

export function BackendStatusBanner() {
  const [status, setStatus] = useState<BackendStatus>('unknown')

  useEffect(() => {
    const cancel = waitForBackend(setStatus)
    return cancel
  }, [])

  if (status === 'ready' || status === 'unknown') return null

  return (
    <div
      className={`w-full text-center text-xs py-2 px-4 flex items-center justify-center gap-2 ${
        status === 'booting'
          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800'
          : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-b border-red-200 dark:border-red-800'
      }`}
    >
      {status === 'booting' ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Backend is starting up — evaluations will be available in ~30 seconds.
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Backend unreachable. Check your connection or try again shortly.
        </>
      )}
    </div>
  )
}
