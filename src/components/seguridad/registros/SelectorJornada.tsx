'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ClipboardList, MapPin, RefreshCw, User, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface MiembroJornada {
  usuarioId: string
  horas: number
  usuario: { id: string; name: string | null }
}

interface TareaJornada {
  id: string
  nombreTareaExtra: string | null
  proyectoTarea: { id: string; nombre: string } | null
  miembros: MiembroJornada[]
}

interface JornadaActiva {
  id: string
  fechaTrabajo: string
  estado: 'iniciado' | 'pendiente'
  ubicacion: string | null
  createdAt: string
  proyecto: { id: string; codigo: string; nombre: string }
  supervisor: { id: string; name: string | null }
  tareas: TareaJornada[]
}

/** Nombre legible de la tarea (proyectoTarea.nombre o nombreTareaExtra) */
export function nombreTarea(t: TareaJornada): string {
  return t.proyectoTarea?.nombre ?? t.nombreTareaExtra ?? '—'
}

/** Set único de trabajadores (supervisor + miembros de todas las tareas) */
export function trabajadoresDeJornada(j: JornadaActiva): { id: string; name: string | null }[] {
  const map = new Map<string, { id: string; name: string | null }>()
  for (const t of j.tareas) {
    for (const m of t.miembros) {
      if (!map.has(m.usuario.id)) map.set(m.usuario.id, m.usuario)
    }
  }
  return Array.from(map.values())
}

interface Props {
  value: string | null
  onChange: (jornadaId: string | null, jornada: JornadaActiva | null) => void
  /** Filtros opcionales — si se pasan, oculta el switch "solo asignadas" */
  filtroProyectoId?: string
  filtroFechaDesde?: string // ISO yyyy-mm-dd
  filtroFechaHasta?: string // ISO yyyy-mm-dd
}

const STORAGE_KEY = 'seguridad:ultimaJornadaId'

interface UltimaJornadaSnapshot {
  id: string
  fecha: string // YYYY-MM-DD del día en el que se guardó
}

function hoyISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function leerUltimaJornadaValida(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UltimaJornadaSnapshot
    if (parsed?.fecha === hoyISO()) return parsed.id
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

function guardarUltimaJornada(id: string) {
  if (typeof window === 'undefined') return
  const snap: UltimaJornadaSnapshot = { id, fecha: hoyISO() }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
}

const ESTADO_CLASS: Record<JornadaActiva['estado'], string> = {
  iniciado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
}

function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

function diasDesde(iso: string): number {
  const ahora = new Date()
  const fecha = new Date(iso)
  const ms = inicioDelDiaCliente(ahora).getTime() - inicioDelDiaCliente(fecha).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function inicioDelDiaCliente(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function SelectorJornada({ value, onChange, filtroProyectoId, filtroFechaDesde, filtroFechaHasta }: Props) {
  const [soloAsignadas, setSoloAsignadas] = useState(true)
  const enModoFiltrado = !!filtroProyectoId

  const query = useQuery<JornadaActiva[]>({
    queryKey: ['seguridad', 'jornadas-activas', soloAsignadas, filtroProyectoId, filtroFechaDesde, filtroFechaHasta],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('soloAsignadas', enModoFiltrado ? 'false' : soloAsignadas ? 'true' : 'false')
      if (filtroProyectoId) params.set('proyectoId', filtroProyectoId)
      if (filtroFechaDesde) params.set('fechaDesde', filtroFechaDesde)
      if (filtroFechaHasta) params.set('fechaHasta', filtroFechaHasta)
      const res = await fetch(`/api/seguridad/registros/jornadas-activas?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('No se pudieron cargar las jornadas')
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  const jornadas = useMemo(() => query.data ?? [], [query.data])

  // Selección automática inicial: localStorage válido → primera jornada
  useEffect(() => {
    if (jornadas.length === 0) {
      if (value !== null) onChange(null, null)
      return
    }
    if (value && jornadas.some((j) => j.id === value)) return

    const ultima = leerUltimaJornadaValida()
    const auto = ultima ? jornadas.find((j) => j.id === ultima) : undefined
    const elegida: JornadaActiva = auto ?? jornadas[0]
    onChange(elegida.id, elegida)
    guardarUltimaJornada(elegida.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadas])

  const seleccionarJornada = (jornada: JornadaActiva) => {
    onChange(jornada.id, jornada)
    guardarUltimaJornada(jornada.id)
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-orange-600" />
            Jornada activa
          </h3>
          <p className="text-xs text-muted-foreground">
            Elige cualquier jornada en curso o pendiente contra la que quieres registrar tu actividad.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          aria-label="Refrescar jornadas"
        >
          <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
        </Button>
      </div>

      {enModoFiltrado ? (
        <p className="text-xs text-orange-600">
          Filtrado a un proyecto y rango específicos (desde el reporte semanal).
        </p>
      ) : (
        <label className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Solo mis proyectos asignados</span>
          <Switch checked={soloAsignadas} onCheckedChange={setSoloAsignadas} />
        </label>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudieron cargar las jornadas. Toca el botón refrescar.
        </div>
      ) : jornadas.length === 0 ? (
        <div className="rounded-md border border-dashed py-6 px-3 text-center space-y-2">
          <CalendarDays className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">No hay jornadas abiertas</p>
          <p className="text-xs text-muted-foreground">
            Pídele a un supervisor que inicie la suya.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="mt-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1', query.isFetching && 'animate-spin')} />
            Refrescar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {jornadas.map((j) => {
            const seleccionada = j.id === value
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => seleccionarJornada(j)}
                className={cn(
                  'w-full text-left rounded-md border p-3 transition min-h-[64px]',
                  'hover:border-orange-300 hover:bg-orange-50/40',
                  seleccionada
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                    : 'border-gray-200 bg-white',
                )}
                aria-pressed={seleccionada}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium text-sm leading-tight">
                    {j.proyecto.nombre}
                  </div>
                  <Badge className={cn('text-[10px] capitalize border', ESTADO_CLASS[j.estado])}>
                    {j.estado}
                  </Badge>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {j.proyecto.codigo}
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {j.supervisor.name ?? '—'}
                  </span>
                  <span className="flex items-center gap-1 justify-end">
                    <CalendarDays className="h-3 w-3" />
                    {formatFechaCorta(j.fechaTrabajo)}
                    {(() => {
                      const d = diasDesde(j.fechaTrabajo)
                      if (d === 0) return <span className="text-emerald-600 font-medium">· hoy</span>
                      if (d === 1) return <span>· ayer</span>
                      if (d > 1) return <span className="text-amber-600">· hace {d} d</span>
                      return null
                    })()}
                  </span>
                  {j.ubicacion && (
                    <span className="col-span-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {j.ubicacion}
                    </span>
                  )}
                  <span className="col-span-2 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {trabajadoresDeJornada(j).length} trabajador{trabajadoresDeJornada(j).length === 1 ? '' : 'es'}
                    {j.tareas.length > 0 && ` · ${j.tareas.length} tarea${j.tareas.length === 1 ? '' : 's'}`}
                  </span>
                </div>
                {j.tareas.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-200 space-y-0.5">
                    {j.tareas.slice(0, 3).map((t) => (
                      <div key={t.id} className="text-[11px] text-gray-600 truncate">
                        • {nombreTarea(t)}
                        {t.miembros.length > 0 && (
                          <span className="text-muted-foreground ml-1">({t.miembros.length})</span>
                        )}
                      </div>
                    ))}
                    {j.tareas.length > 3 && (
                      <div className="text-[10px] italic text-muted-foreground">
                        + {j.tareas.length - 3} tarea{j.tareas.length - 3 === 1 ? '' : 's'} más…
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export type { JornadaActiva }
