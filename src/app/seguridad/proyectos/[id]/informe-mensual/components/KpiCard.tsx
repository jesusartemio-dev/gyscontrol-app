'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'

type Variant = 'default' | 'success' | 'warning' | 'danger'

interface Props {
  label: string
  value: string | number
  icon?: LucideIcon
  subtitle?: string
  trend?: 'up' | 'down'
  variant?: Variant
}

const VARIANT_STYLES: Record<Variant, string> = {
  default: 'bg-muted/30 border',
  success: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  danger: 'bg-red-50 border-red-200',
}

const VALUE_COLOR: Record<Variant, string> = {
  default: '',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
}

export function KpiCard({ label, value, icon: Icon, subtitle, trend, variant = 'default' }: Props) {
  return (
    <div className={cn('rounded-lg p-3 text-center space-y-0.5', VARIANT_STYLES[variant])}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <div className="flex items-center justify-center gap-1">
        <p className={cn('text-2xl font-bold tabular-nums', VALUE_COLOR[variant])}>{value}</p>
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
      </div>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
