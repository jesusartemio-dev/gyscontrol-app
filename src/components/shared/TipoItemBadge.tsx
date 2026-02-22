'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Props {
  tipoItem?: string
  catalogoEquipoId?: string | null
  size?: 'sm' | 'xs'
}

const CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  equipo: {
    label: 'Equipo',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    tooltip: 'Equipo del catálogo',
  },
  equipo_libre: {
    label: 'Eq. libre',
    className: 'bg-blue-50 text-blue-500 border-blue-100',
    tooltip: 'Equipo ingresado manualmente',
  },
  consumible: {
    label: 'Consumible',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
    tooltip: 'Material consumible',
  },
  servicio: {
    label: 'Servicio',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
    tooltip: 'Servicio / trabajo',
  },
}

export default function TipoItemBadge({ tipoItem, catalogoEquipoId, size = 'xs' }: Props) {
  const tipo = tipoItem || 'equipo'

  let configKey = tipo
  if (tipo === 'equipo' && !catalogoEquipoId) {
    configKey = 'equipo_libre'
  }

  const config = CONFIG[configKey] || CONFIG.equipo

  // Don't show badge for catalog equipment (default case)
  if (tipo === 'equipo' && catalogoEquipoId) return null

  const sizeClass = size === 'xs' ? 'text-[9px] h-4 px-1' : 'text-[10px] h-5 px-1.5'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${sizeClass} font-medium ${config.className}`}>
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
