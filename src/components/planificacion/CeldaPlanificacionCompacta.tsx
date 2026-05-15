'use client'

import { cn } from '@/lib/utils'
import { colorParaProyecto } from '@/lib/utils/planificacion'

// Normalized cell type that works with both /semana and /persona API shapes
export interface CeldaCompacta {
  id: string
  turno: string
  tipo: 'proyecto' | 'ausencia'
  proyecto?: { id: string; codigo: string; nombre: string; color?: string }
  // /semana uses { tipo, codigo, color }; /persona uses { nombre, color }
  ausencia?: { nombre?: string; tipo?: string; codigo?: string; color?: string | null }
  esExcepcional: boolean
  notas: string | null
}

interface Props {
  celda: CeldaCompacta | null
  mostrarNotas?: boolean
  onTap?: () => void
  className?: string
}

export function CeldaPlanificacionCompacta({ celda, mostrarNotas, onTap, className }: Props) {
  if (!celda) {
    return (
      <div className={cn('flex items-center gap-2 py-0.5', className)}>
        <div className="w-1 self-stretch rounded-full bg-transparent" />
        <span className="text-sm text-muted-foreground">—</span>
      </div>
    )
  }

  if (celda.tipo === 'ausencia') {
    const ausColor = celda.ausencia?.color ?? '#9ca3af'
    const ausLabel =
      celda.ausencia?.codigo ??
      celda.ausencia?.nombre ??
      celda.ausencia?.tipo ??
      'AUS'
    return (
      <button
        onClick={onTap}
        type="button"
        className={cn(
          'flex items-start gap-2 py-0.5 text-left w-full rounded px-1 -ml-1',
          onTap && 'hover:bg-muted/30 cursor-pointer',
          !onTap && 'cursor-default',
          className,
        )}
      >
        <div
          className="w-1 self-stretch min-h-[1.1rem] rounded-full flex-shrink-0"
          style={{
            background: `repeating-linear-gradient(45deg, ${ausColor}99, ${ausColor}99 2px, transparent 2px, transparent 4px)`,
          }}
        />
        <div className="min-w-0">
          <span className="text-sm text-muted-foreground">{ausLabel}</span>
          {celda.esExcepcional && <span className="ml-1 text-[10px]">⏰</span>}
          {mostrarNotas && celda.notas && (
            <p className="text-xs text-muted-foreground mt-0.5">{celda.notas}</p>
          )}
        </div>
      </button>
    )
  }

  const color = celda.proyecto?.color ?? colorParaProyecto(celda.proyecto?.id ?? '')
  return (
    <button
      onClick={onTap}
      type="button"
      className={cn(
        'flex items-start gap-2 py-0.5 text-left w-full rounded px-1 -ml-1',
        onTap && 'hover:bg-muted/30 cursor-pointer',
        !onTap && 'cursor-default',
        className,
      )}
    >
      <div
        className="w-1 self-stretch min-h-[1.1rem] rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <span className="text-sm font-medium" style={{ color }}>
          {celda.proyecto?.codigo}
        </span>
        {celda.esExcepcional && <span className="ml-1 text-[10px]">⏰</span>}
        {mostrarNotas && celda.notas && (
          <p className="text-xs text-muted-foreground mt-0.5">{celda.notas}</p>
        )}
      </div>
    </button>
  )
}
