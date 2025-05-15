import { cn } from '@/lib/utils'

const badgeVariants = {
  default: 'bg-blue-500 text-white',
  outline: 'border border-gray-300 text-gray-800',
}

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div className={cn('inline-block px-2 py-1 rounded text-sm', badgeVariants[variant], className)} {...props} />
  )
}
