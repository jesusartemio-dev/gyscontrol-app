'use client'

/**
 * MiJornadaTimeline - Compact timeline/feed for "mi jornada" page
 *
 * Replaces the heavier ListaJornadas for the personal view.
 * Shows estado tab pills + compact rows with click-to-detail.
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Clock,
  Users,
  ListTodo,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Loader2,
  RefreshCcw,
  Trash2,
  ChevronRight,
  Calendar
} from 'lucide-react'

type EstadoJornada = 'iniciado' | 'pendiente' | 'aprobado' | 'rechazado'
type TabFilter = 'todas' | EstadoJornada

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface TareaResumen {
  id: string
  proyectoTarea?: {
    id: string
    nombre: string
    porcentajeCompletado?: number | null
  } | null
  nombreTareaExtra?: string | null
  porcentajeInicial?: number | null
  porcentajeFinal?: number | null
}

interface JornadaResumen {
  id: string
  proyecto: Proyecto
  fechaTrabajo: string
  estado: EstadoJornada
  objetivosDia?: string | null
  avanceDia?: string | null
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
  motivoRechazo?: string | null
  createdAt: string
  tareas?: TareaResumen[]
}

interface MiJornadaTimelineProps {
  jornadas: JornadaResumen[]
  onVerDetalle: (jornadaId: string) => void
  onReabrir?: (jornadaId: string) => void
  onEliminar?: (jornadaId: string) => void
  reabriendo?: string | null
  eliminando?: string | null
  loading?: boolean
}

export function MiJornadaTimeline({
  jornadas,
  onVerDetalle,
  onReabrir,
  onEliminar,
  reabriendo = null,
  eliminando = null,
  loading = false
}: MiJornadaTimelineProps) {
  const [tab, setTab] = useState<TabFilter>('todas')

  // Counts per estado
  const counts = useMemo(() => {
    const c = { todas: jornadas.length, iniciado: 0, pendiente: 0, aprobado: 0, rechazado: 0 }
    for (const j of jornadas) {
      c[j.estado]++
    }
    return c
  }, [jornadas])

  // Filter + sort
  const filtered = useMemo(() => {
    const list = tab === 'todas' ? jornadas : jornadas.filter(j => j.estado === tab)
    // Sort: en curso first, then pendiente, rechazado, aprobado; within group by date desc
    const prio: Record<string, number> = { iniciado: 0, pendiente: 1, rechazado: 2, aprobado: 3 }
    return [...list].sort((a, b) => {
      const pa = prio[a.estado] ?? 9
      const pb = prio[b.estado] ?? 9
      if (pa !== pb) return pa - pb
      return new Date(b.fechaTrabajo).getTime() - new Date(a.fechaTrabajo).getTime()
    })
  }, [jornadas, tab])

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha)
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
  }

  const formatFechaLarga = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const getEstadoStyle = (estado: EstadoJornada) => {
    switch (estado) {
      case 'iniciado':
        return { bg: 'bg-green-100 text-green-700', icon: Clock, label: 'En curso', dot: 'bg-green-500' }
      case 'pendiente':
        return { bg: 'bg-amber-100 text-amber-700', icon: AlertCircle, label: 'Pendiente', dot: 'bg-amber-500' }
      case 'aprobado':
        return { bg: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Aprobado', dot: 'bg-blue-500' }
      case 'rechazado':
        return { bg: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rechazado', dot: 'bg-red-500' }
    }
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'aprobado', label: 'Aprobadas' },
    { key: 'rechazado', label: 'Rechazadas' },
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
          Cargando jornadas...
        </CardContent>
      </Card>
    )
  }

  // Don't show anything if no jornadas at all (active ones are shown separately)
  const nonActive = jornadas.filter(j => j.estado !== 'iniciado')
  if (nonActive.length === 0 && counts.iniciado === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {/* Tab pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map(t => {
          const count = counts[t.key]
          if (t.key !== 'todas' && count === 0) return null
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
              <span className={`text-[10px] ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Timeline rows */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-gray-500 text-sm">
            No hay jornadas {tab !== 'todas' ? 'con este estado' : 'registradas'}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map(jornada => {
              const est = getEstadoStyle(jornada.estado)
              const EstIcon = est.icon
              const isProcessing = reabriendo === jornada.id || eliminando === jornada.id
              const hasActions = jornada.estado === 'rechazado' && (onReabrir || onEliminar)

              return (
                <div
                  key={jornada.id}
                  className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  onClick={() => onVerDetalle(jornada.id)}
                >
                  {/* Date column */}
                  <div className="flex-shrink-0 w-[3.2rem] text-center">
                    <div className="text-xs font-semibold text-gray-700 leading-tight">
                      {formatFecha(jornada.fechaTrabajo)}
                    </div>
                  </div>

                  {/* Estado dot */}
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${est.dot}`} />

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Project + Estado */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{jornada.proyecto.codigo}</span>
                      <Badge className={`${est.bg} text-[10px] px-1.5 py-0 h-[18px] border-0`}>
                        <EstIcon className="h-2.5 w-2.5 mr-0.5" />
                        {est.label}
                      </Badge>
                    </div>

                    {/* Row 2: Stats + task progress */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                        <ListTodo className="h-3 w-3" />
                        {jornada.cantidadTareas}
                      </span>
                      <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {jornada.cantidadMiembros}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {jornada.totalHoras}h
                      </span>
                      {/* Task progress badges - desktop only, max 2 */}
                      {jornada.tareas && jornada.tareas.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1 ml-1">
                          {jornada.tareas.slice(0, 2).map(tarea => {
                            const pctFinal = tarea.porcentajeFinal ?? tarea.proyectoTarea?.porcentajeCompletado
                            const pctInicial = tarea.porcentajeInicial
                            const hasRange = pctInicial != null && pctFinal != null
                            const hasPct = pctFinal != null
                            const nombre = tarea.proyectoTarea?.nombre || tarea.nombreTareaExtra || 'Tarea'
                            const short = nombre.length > 15 ? nombre.substring(0, 13) + '…' : nombre
                            return (
                              <span
                                key={tarea.id}
                                className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-1 py-0 truncate max-w-[140px]"
                              >
                                {short}
                                {hasRange ? (
                                  <span className="font-semibold text-gray-600 ml-0.5">{pctInicial}→{pctFinal}%</span>
                                ) : hasPct ? (
                                  <span className="font-semibold text-gray-600 ml-0.5">{pctFinal}%</span>
                                ) : null}
                              </span>
                            )
                          })}
                          {jornada.tareas.length > 2 && (
                            <span className="text-[10px] text-gray-400">+{jornada.tareas.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Motivo rechazo - compact */}
                    {jornada.motivoRechazo && (
                      <div className="text-[11px] text-red-600 mt-0.5 truncate max-w-[260px] sm:max-w-none">
                        Rechazo: {jornada.motivoRechazo}
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex-shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : hasActions ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onVerDetalle(jornada.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalle
                          </DropdownMenuItem>
                          {onReabrir && (
                            <DropdownMenuItem
                              onClick={() => onReabrir(jornada.id)}
                              className="text-blue-600 focus:text-blue-600"
                            >
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Reabrir
                            </DropdownMenuItem>
                          )}
                          {onEliminar && (
                            <DropdownMenuItem
                              onClick={() => onEliminar(jornada.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
