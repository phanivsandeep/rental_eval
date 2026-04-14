import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (score >= 50) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

export function ScoreBadge({ score, size = 'md', className }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-sm px-2 py-0.5 rounded-md',
    md: 'text-base px-3 py-1 rounded-lg font-semibold',
    lg: 'text-4xl px-5 py-3 rounded-xl font-bold',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border font-mono',
        scoreColor(score),
        sizeClasses[size],
        className
      )}
    >
      {score}
      {size !== 'sm' && (
        <span className={cn('font-sans font-normal', size === 'lg' ? 'text-lg' : 'text-xs opacity-70')}>
          {scoreLabel(score)}
        </span>
      )}
    </span>
  )
}
