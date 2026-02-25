'use client'

import { useState, useEffect } from 'react'
import { Clock, Loader2, Package, FileText, Truck, CheckCircle, Send, ShoppingCart, Trophy, XCircle, RotateCcw } from 'lucide-react'
import clsx from 'clsx'

interface EventoTimeline {
  id: string
  tipo: string
  descripcion: string
  fechaEvento: string
  user: { name: string | null } | null
  metadata: Record<string, any> | null
}

const TIPO_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  lista_enviada: { icon: Send, color: 'text-blue-500 bg-blue-100', label: 'Lista Enviada' },
  pedido_creado: { icon: ShoppingCart, color: 'text-purple-500 bg-purple-100', label: 'Pedido Creado' },
  oc_generada: { icon: FileText, color: 'text-amber-500 bg-amber-100', label: 'OC Generada' },
  recepcion_en_almacen: { icon: Package, color: 'text-orange-500 bg-orange-100', label: 'En Almacén' },
  entrega_a_proyecto: { icon: CheckCircle, color: 'text-emerald-500 bg-emerald-100', label: 'Entregado' },
  cotizacion_seleccionada: { icon: Trophy, color: 'text-amber-600 bg-amber-100', label: 'Cotización Seleccionada' },
  cotizacion_deseleccionada: { icon: XCircle, color: 'text-gray-500 bg-gray-100', label: 'Cotización Deseleccionada' },
  oc_retrocedida: { icon: RotateCcw, color: 'text-orange-500 bg-orange-100', label: 'OC Retrocedida' },
  lista_retrocedida: { icon: RotateCcw, color: 'text-orange-500 bg-orange-100', label: 'Lista Retrocedida' },
  pedido_retrocedido: { icon: RotateCcw, color: 'text-orange-500 bg-orange-100', label: 'Pedido Retrocedido' },
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ListaTimelineProps {
  listaId: string
  className?: string
}

export default function ListaTimeline({ listaId, className }: ListaTimelineProps) {
  const [eventos, setEventos] = useState<EventoTimeline[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(`/api/lista-equipo/${listaId}/timeline`)
        if (res.ok) {
          const data = await res.json()
          setEventos(data.eventos || [])
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [listaId])

  if (loading) {
    return (
      <div className={clsx('flex items-center justify-center py-6 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando timeline...
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center py-6 text-sm text-muted-foreground', className)}>
        <Clock className="h-6 w-6 mb-2 opacity-30" />
        <span>Sin eventos registrados</span>
      </div>
    )
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Línea vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-3">
        {eventos.map((evento, idx) => {
          const config = TIPO_CONFIG[evento.tipo] || {
            icon: Clock,
            color: 'text-gray-500 bg-gray-100',
            label: evento.tipo,
          }
          const Icon = config.icon

          return (
            <div key={evento.id} className="relative flex items-start gap-3 pl-1">
              {/* Icono */}
              <div className={clsx(
                'relative z-10 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0',
                config.color
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{config.label}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatFecha(evento.fechaEvento)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {evento.descripcion}
                </p>
                {evento.user?.name && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    por {evento.user.name}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
