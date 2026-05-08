import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react'
import type { EstadoBloque } from '@/types/tdr'

interface Props {
  estado: EstadoBloque
  showIcon?: boolean
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const config: Record<
  EstadoBloque,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  completo: {
    label: 'Completo',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2,
  },
  parcial: {
    label: 'Parcial',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: AlertCircle,
  },
  vacio: {
    label: 'Vacío',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
    Icon: Circle,
  },
}

export function EstadoBloqueBadge({
  estado,
  showIcon = true,
  showLabel = true,
  size = 'sm',
}: Props) {
  const { label, className, Icon } = config[estado]
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <Badge variant="outline" className={`${className} gap-1`}>
      {showIcon && <Icon className={iconSize} />}
      {showLabel && <span>{label}</span>}
    </Badge>
  )
}
