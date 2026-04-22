'use client'

import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import {
  History, ChevronDown, ShoppingCart, Warehouse, Package, PackageCheck, X, RefreshCw,
  Activity, FileCheck, Send, ArrowLeftRight, CheckCircle2, Ban, DollarSign, FileX, Sparkles,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Evento {
  id: string
  tipo: string
  descripcion: string
  fechaEvento: string | Date
  user?: { name: string | null } | null
}

interface Props {
  eventos: Evento[]
  className?: string
  title?: string
  /** Agrupar eventos del mismo tipo + usuario + día cuando hay 3 o más consecutivos */
  groupRepeated?: boolean
}

const iconMap: Record<string, { icon: any; color: string }> = {
  // Pedido / OC / Recepción
  oc_generada: { icon: ShoppingCart, color: 'text-blue-500' },
  oc_completada: { icon: CheckCircle2, color: 'text-emerald-500' },
  oc_retrocedida: { icon: ArrowLeftRight, color: 'text-amber-500' },
  recepcion_en_almacen: { icon: Warehouse, color: 'text-green-500' },
  recepcion_confirmada: { icon: PackageCheck, color: 'text-green-600' },
  recepcion_eliminada: { icon: X, color: 'text-red-500' },
  entrega_a_proyecto: { icon: Package, color: 'text-purple-500' },
  rechazo_recepcion: { icon: X, color: 'text-red-600' },
  rechazo_revertido: { icon: RefreshCw, color: 'text-amber-500' },
  pedido_creado: { icon: ShoppingCart, color: 'text-blue-600' },
  pedido_retrocedido: { icon: ArrowLeftRight, color: 'text-amber-600' },
  // Lista
  lista_creada: { icon: Sparkles, color: 'text-indigo-500' },
  lista_enviada: { icon: Send, color: 'text-blue-500' },
  lista_aprobada: { icon: FileCheck, color: 'text-emerald-600' },
  lista_anulada: { icon: Ban, color: 'text-red-600' },
  lista_cotizada: { icon: DollarSign, color: 'text-emerald-500' },
  lista_retrocedida: { icon: ArrowLeftRight, color: 'text-amber-600' },
  cotizacion_seleccionada: { icon: DollarSign, color: 'text-emerald-500' },
  cotizacion_deseleccionada: { icon: FileX, color: 'text-orange-500' },
}

function getDayKey(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toISOString().slice(0, 10)
}

type DisplayRow =
  | { kind: 'single'; evento: Evento }
  | { kind: 'group'; tipo: string; eventos: Evento[]; usuario: string; fecha: string | Date }

function groupEventos(eventos: Evento[]): DisplayRow[] {
  const rows: DisplayRow[] = []
  let i = 0
  while (i < eventos.length) {
    const ev = eventos[i]
    // Solo se agrupa `cotizacion_seleccionada` del mismo usuario y día
    if (ev.tipo === 'cotizacion_seleccionada') {
      let j = i + 1
      while (
        j < eventos.length &&
        eventos[j].tipo === 'cotizacion_seleccionada' &&
        eventos[j].user?.name === ev.user?.name &&
        getDayKey(eventos[j].fechaEvento) === getDayKey(ev.fechaEvento)
      ) {
        j++
      }
      const bloque = eventos.slice(i, j)
      if (bloque.length >= 3) {
        rows.push({
          kind: 'group',
          tipo: 'cotizacion_seleccionada',
          eventos: bloque,
          usuario: ev.user?.name ?? 'Sistema',
          fecha: ev.fechaEvento,
        })
        i = j
        continue
      }
    }
    rows.push({ kind: 'single', evento: ev })
    i++
  }
  return rows
}

export default function ListaEquipoTimeline({
  eventos,
  className,
  title = 'Timeline de Trazabilidad',
  groupRepeated = true,
}: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})

  if (!eventos || eventos.length === 0) return null

  const rows = groupRepeated ? groupEventos(eventos) : eventos.map((e) => ({ kind: 'single' as const, evento: e }))

  const toggleGroup = (idx: number) =>
    setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }))

  return (
    <Collapsible defaultOpen className={className}>
      <div className="bg-white rounded-lg border">
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{title}</span>
              <Badge variant="outline" className="text-[10px] h-5 ml-1">
                {eventos.length} eventos
              </Badge>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t">
            <div className="pt-4 space-y-3">
              {rows.map((row, idx) => {
                if (row.kind === 'group') {
                  const { icon: Icon, color } = iconMap[row.tipo] ?? { icon: Activity, color: 'text-gray-500' }
                  const open = !!expandedGroups[idx]
                  return (
                    <div key={idx} className="space-y-2">
                      <button
                        onClick={() => toggleGroup(idx)}
                        className="flex items-start gap-3 text-xs w-full text-left hover:bg-gray-50 rounded p-1 -m-1"
                      >
                        <Icon className={cn('h-3.5 w-3.5 flex-shrink-0 mt-0.5', color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700">
                            <strong>{row.eventos.length} cotizaciones seleccionadas</strong>
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {formatDate(row.fecha)} • {row.usuario}
                          </p>
                        </div>
                        <ChevronDown className={cn('h-3 w-3 text-gray-400 transition-transform', open && 'rotate-180')} />
                      </button>
                      {open && (
                        <div className="pl-6 space-y-2 border-l-2 border-gray-100 ml-1.5">
                          {row.eventos.map((evento) => (
                            <div key={evento.id} className="flex items-start gap-3 text-xs">
                              <Icon className={cn('h-3 w-3 flex-shrink-0 mt-0.5 opacity-70', color)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-600">{evento.descripcion}</p>
                                <p className="text-muted-foreground text-[10px]">{formatDate(evento.fechaEvento)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
                const { evento } = row
                const { icon: Icon, color } = iconMap[evento.tipo] ?? { icon: Activity, color: 'text-gray-500' }
                return (
                  <div key={evento.id} className="flex items-start gap-3 text-xs">
                    <Icon className={cn('h-3.5 w-3.5 flex-shrink-0 mt-0.5', color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700">{evento.descripcion}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {formatDate(evento.fechaEvento)} • {evento.user?.name ?? 'Sistema'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
