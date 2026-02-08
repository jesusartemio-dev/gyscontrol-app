'use client'

import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Send,
  FileCheck,
  ThumbsUp,
  Truck,
  Calculator,
  DollarSign,
  Target
} from 'lucide-react'
import { ListaEquipo } from '@/types'
import { getTimelineFechas, calcularDiasRestantes, getEstadoTiempo } from '@/lib/services/listaEquipo'
import { formatDate, cn } from '@/lib/utils'

interface Props {
  lista: ListaEquipo | null | undefined
  className?: string
}

const iconMap = {
  creado: Calendar,
  enviado_revision: Send,
  por_aprobar: FileCheck,
  aprobado: ThumbsUp,
  enviado_logistica: Truck,
  en_cotizacion: Calculator,
  cotizado: DollarSign,
  aprobado_final: CheckCircle,
  fecha_limite: Target
}

const estadoColorMap = {
  critico: 'bg-red-500 border-red-500 text-white',
  urgente: 'bg-orange-500 border-orange-500 text-white',
  normal: 'bg-green-500 border-green-500 text-white'
}

export default function ListaEquipoTimeline({ lista, className }: Props) {
  if (!lista) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No hay información de timeline disponible
      </p>
    )
  }

  const timeline = getTimelineFechas(lista)
  const diasRestantes = calcularDiasRestantes(lista.fechaNecesaria || null)
  const estadoTiempo = getEstadoTiempo(diasRestantes)

  if (timeline.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">No hay fechas de seguimiento registradas.</p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with deadline info */}
      {diasRestantes !== null && estadoTiempo && (
        <div className="flex items-center justify-between">
          <Badge
            variant={estadoTiempo === 'critico' ? 'destructive' : estadoTiempo === 'urgente' ? 'secondary' : 'default'}
            className="text-[10px] px-1.5 py-0"
          >
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
            {diasRestantes < 0
              ? `${Math.abs(diasRestantes)} días vencido`
              : `${diasRestantes} días restantes`
            }
          </Badge>
          {lista.fechaNecesaria && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Target className="h-2.5 w-2.5" />
              Objetivo: {formatDate(lista.fechaNecesaria)}
            </span>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-2">
          {timeline.map((item, index) => {
            const Icon = iconMap[item.estado as keyof typeof iconMap] || Calendar
            const isLimit = item.esLimite

            return (
              <div
                key={`${item.estado}-${item.fecha}`}
                className="relative flex items-center gap-3"
              >
                <div className={cn(
                  'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border flex-shrink-0',
                  item.completado
                    ? 'bg-green-500 border-green-500 text-white'
                    : isLimit && estadoTiempo
                      ? estadoColorMap[estadoTiempo]
                      : 'bg-white border-gray-300 text-gray-400'
                )}>
                  <Icon className="h-3 w-3" />
                </div>

                <div className="flex items-center justify-between flex-1 min-w-0 py-0.5">
                  <span className={cn(
                    'text-xs',
                    item.completado ? 'text-gray-800' : 'text-gray-400'
                  )}>
                    {item.descripcion}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className={cn(
                      'text-[10px] font-mono',
                      item.completado ? 'text-gray-500' : 'text-gray-300'
                    )}>
                      {formatDate(item.fecha)}
                    </span>
                    {isLimit && !item.completado && diasRestantes !== null && (
                      <span className={cn(
                        'text-[10px]',
                        estadoTiempo === 'critico' ? 'text-red-600' : estadoTiempo === 'urgente' ? 'text-orange-600' : 'text-green-600'
                      )}>
                        {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d vencido` : diasRestantes === 0 ? 'hoy' : `${diasRestantes}d`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="text-[10px] text-muted-foreground pt-1 border-t">
        {timeline.filter(item => item.completado).length}/{timeline.length} hitos completados
      </div>
    </div>
  )
}
