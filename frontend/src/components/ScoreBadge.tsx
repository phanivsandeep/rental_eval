import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function matchColor(score: number) {
  if (score >= 75) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  if (score >= 50) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
}

function matchLabel(score: number) {
  if (score >= 80) return 'Strong match'
  if (score >= 60) return 'Good match'
  if (score >= 40) return 'Partial match'
  return 'Poor match'
}

export function ScoreBadge({ score, size = 'md', className }: ScoreBadgeProps) {
  const sizeClasses = {
    sm:  'text-sm px-2 py-0.5 rounded-md',
    md:  'text-base px-3 py-1 rounded-lg font-semibold',
    lg:  'text-4xl px-5 py-3 rounded-xl font-bold',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border font-mono',
        matchColor(score),
        sizeClasses[size],
        className
      )}
    >
      {score}
      {size !== 'sm' && (
        <span className={cn('font-sans font-normal', size === 'lg' ? 'text-lg' : 'text-xs opacity-70')}>
          {matchLabel(score)}
        </span>
      )}
    </span>
  )
}
