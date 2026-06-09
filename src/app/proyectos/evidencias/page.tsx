'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Gauge,
  HardHat,
  Image as ImageIcon,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SelectorJornada, type JornadaActiva } from '@/components/proyectos/evidencias/SelectorJornada'
import { TIPO_REGISTRO_AVANCE_LABELS, type TipoRegistroAvance } from '@/lib/validators/registroAvance'
import { cn } from '@/lib/utils'

interface EvidenciaResumen {
  id: string
  estado: 'abierta' | 'cerrada'
  observaciones: string | null
  fechaCierre: string | null
  createdAt: string
  updatedAt: string
  jornada: {
    id: string
    fechaTrabajo: string
    estado: string
    ubicacion: string | null
    proyecto: { id: string; codigo: string; nombre: string }
    supervisor: { id: string; name: string | null }
  }
  creadoPor: { id: string; name: string | null }
  registrosCount: number
  fotosCount: number
  tipoCount: Partial<Record<TipoRegistroAvance, number>>
}

interface ProyectoOpt {
  id: string
  codigo: string
  nombre: string
}

interface RegistroListaItem {
  id: string
  tipo: TipoRegistroAvance
  descripcion: string
  disciplina: string | null
  porcentajeAvance: number | null
  fotos: Array<{ id: string; nombreArchivo: string }>
}

const TIPO_COLOR: Record<TipoRegistroAvance, string> = {
  avance_general: 'bg-blue-100 text-blue-700 border-blue-200',
  montaje_instalacion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  conexionado_electrico: 'bg-amber-100 text-amber-700 border-amber-200',
  instrumentacion: 'bg-violet-100 text-violet-700 border-violet-200',
  pruebas_comisionamiento: 'bg-teal-100 text-teal-700 border-teal-200',
  inspeccion_calidad: 'bg-rose-100 text-rose-700 border-rose-200',
}

const TIPO_BORDER: Record<TipoRegistroAvance, string> = {
  avance_general: 'border-l-blue-500',
  montaje_instalacion: 'border-l-emerald-500',
  conexionado_electrico: 'border-l-amber-500',
  instrumentacion: 'border-l-violet-500',
  pruebas_comisionamiento: 'border-l-teal-500',
  inspeccion_calidad: 'border-l-rose-500',
}

function RegistrosEvidencia({
  jornada,
}: {
  evidenciaId: string
  jornada: EvidenciaResumen['jornada']
}) {
  const { data, isLoading } = useQuery<RegistroListaItem[]>({
    queryKey: ['proyectos', 'registros-ev', jornada.id],
    queryFn: async () => {
      const sp = new URLSearchParams({
        proyectoId: jornada.proyecto.id,
        fechaDesde: jornada.fechaTrabajo.slice(0, 10),
        fechaHasta: jornada.fechaTrabajo.slice(0, 10),
      })
      const res = await fetch(`/api/proyectos/registros-evidencia?${sp}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  if (isLoading) return (
    <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando registros…
    </div>
  )
  if (!data?.length) return (
    <div className="border-t border-gray-100 px-4 py-3 text-xs text-muted-foreground">
      Sin registros en esta evidencia.
    </div>
  )

  return (
    <div className="divide-y divide-gray-100 border-t border-gray-200">
      {data.map((r) => (
        <div
          key={r.id}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 bg-white border-l-4',
            TIPO_BORDER[r.tipo],
          )}
        >
          <div className="h-10 w-10 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center">
            {r.fotos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/proyectos/registros-evidencia/fotos/${r.fotos[0].id}/contenido`}
                alt={r.fotos[0].nombreArchivo}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-medium shrink-0', TIPO_COLOR[r.tipo])}>
                {TIPO_REGISTRO_AVANCE_LABELS[r.tipo]}
              </span>
              <span className="text-xs text-gray-700 truncate">{r.descripcion}</span>
            </div>
            {(r.disciplina || r.porcentajeAvance != null) && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                {r.disciplina && <span>{r.disciplina}</span>}
                {r.porcentajeAvance != null && (
                  <span className="flex items-center gap-0.5"><Gauge className="h-3 w-3" /> {r.porcentajeAvance}%</span>
                )}
              </p>
            )}
          </div>
          {r.fotos.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
              <ImageIcon className="h-3 w-3" /> {r.fotos.length}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hace7DiasISO() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EvidenciasAvanceListaPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const esAdmin = session?.user?.role === 'admin'

  // Deep-link params soportados: proyectoId, fechaDesde, fechaHasta, estado
  const proyectoIdParam = searchParams.get('proyectoId') ?? ''
  const fechaDesdeParam = searchParams.get('fechaDesde') ?? ''
  const fechaHastaParam = searchParams.get('fechaHasta') ?? ''
  const estadoParam = searchParams.get('estado')

  const [filtroProyecto, setFiltroProyecto] = useState(proyectoIdParam)
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(fechaDesdeParam || hace7DiasISO())
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(fechaHastaParam || hoyISO())
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'abierta' | 'cerrada'>(
    estadoParam === 'abierta' || estadoParam === 'cerrada' ? estadoParam : 'todos',
  )

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const [dialogAbrir, setDialogAbrir] = useState(false)
  const [jornadaSel, setJornadaSel] = useState<JornadaActiva | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)

  const proyectosQuery = useQuery<ProyectoOpt[]>({
    queryKey: ['proyectos', 'lista-min'],
    queryFn: async () => {
      const res = await fetch('/api/proyecto', { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar proyectos')
      const data = await res.json()
      return (data as Array<{ id: string; codigo: string; nombre: string }>).map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })

  const queryString = useMemo(() => {
    const sp = new URLSearchParams()
    if (filtroProyecto) sp.set('proyectoId', filtroProyecto)
    if (filtroFechaDesde) sp.set('fechaDesde', filtroFechaDesde)
    if (filtroFechaHasta) sp.set('fechaHasta', filtroFechaHasta)
    if (filtroEstado !== 'todos') sp.set('estado', filtroEstado)
    return sp.toString()
  }, [filtroProyecto, filtroFechaDesde, filtroFechaHasta, filtroEstado])

  const evidenciasQuery = useQuery<EvidenciaResumen[]>({
    queryKey: ['proyectos', 'evidencias', queryString],
    queryFn: async () => {
      const url = `/api/proyectos/evidencias${queryString ? `?${queryString}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar evidencias')
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  const abrirEvidenciaMutation = useMutation({
    mutationFn: async (jornadaId: string) => {
      const res = await fetch('/api/proyectos/evidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ registroHorasCampoId: jornadaId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo abrir la evidencia')
      }
      return (await res.json()) as { id: string }
    },
    onSuccess: (ev) => {
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencias'] })
      router.push(`/proyectos/evidencias/${ev.id}`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al abrir evidencia'),
  })

  const eliminarMutation = useMutation({
    mutationFn: async (evidenciaId: string) => {
      const res = await fetch(`/api/proyectos/evidencias/${evidenciaId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo eliminar la evidencia')
      }
    },
    onSuccess: () => {
      toast.success('Evidencia eliminada')
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencias'] })
      setConfirmEliminar(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  const evidencias = evidenciasQuery.data ?? []

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/proyectos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-600" />
            Evidencias técnicas
          </h1>
          <p className="text-sm text-muted-foreground">
            Una evidencia por jornada de campo · agrupa el avance técnico del día
          </p>
        </div>
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          onClick={() => setDialogAbrir(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> Nueva evidencia
        </Button>
      </div>

      {/* ── Filtros ──────────────────────────────────────── */}
      <Card>
        <CardContent className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="f-proyecto" className="text-xs">Proyecto</Label>
            <Select
              value={filtroProyecto || 'todos'}
              onValueChange={(v) => setFiltroProyecto(v === 'todos' ? '' : v)}
            >
              <SelectTrigger id="f-proyecto" className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(proyectosQuery.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codigo} — {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="f-desde" className="text-xs">Desde</Label>
            <Input
              id="f-desde"
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-hasta" className="text-xs">Hasta</Label>
            <Input
              id="f-hasta"
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="f-estado" className="text-xs">Estado</Label>
            <Select
              value={filtroEstado}
              onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}
            >
              <SelectTrigger id="f-estado" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="abierta">Abiertas</SelectItem>
                <SelectItem value="cerrada">Cerradas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Lista ────────────────────────────────────────── */}
      {evidenciasQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : evidenciasQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar las evidencias.
        </div>
      ) : evidencias.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No hay evidencias en el rango seleccionado.
        </div>
      ) : (
        <div className="space-y-2">
          {evidencias.map((ev) => {
            const isExpanded = expandedIds.has(ev.id)
            return (
              <div
                key={ev.id}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white"
              >
                {/* ── Card header ── */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <HardHat className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold leading-tight">
                            {ev.jornada.proyecto.nombre}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-gray-200 px-1.5 py-0.5 rounded shrink-0">
                            {ev.jornada.proyecto.codigo}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap mt-1">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {formatFecha(ev.jornada.fechaTrabajo)}
                          </span>
                          {ev.jornada.supervisor.name && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Users className="h-3 w-3" /> {ev.jornada.supervisor.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={cn(
                          'text-[10px] border',
                          ev.estado === 'abierta'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-200 text-gray-700 border-gray-300',
                        )}
                      >
                        {ev.estado === 'abierta' ? (
                          <LockOpen className="h-3 w-3 mr-0.5" />
                        ) : (
                          <Lock className="h-3 w-3 mr-0.5" />
                        )}
                        {ev.estado}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => toggleExpand(ev.id)}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                        title={isExpanded ? 'Ocultar registros' : 'Ver registros'}
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform duration-200',
                            isExpanded && 'rotate-180',
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {Object.keys(ev.tipoCount).length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {(Object.entries(ev.tipoCount) as [TipoRegistroAvance, number][]).map(
                        ([tipo, count]) => (
                          <span
                            key={tipo}
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded border font-medium',
                              TIPO_COLOR[tipo],
                            )}
                          >
                            {TIPO_REGISTRO_AVANCE_LABELS[tipo]}
                            {count > 1 && ` ×${count}`}
                          </span>
                        ),
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-gray-100">
                    <span>{ev.registrosCount} registros</span>
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> {ev.fotosCount} fotos
                    </span>
                    <span>Abierta por {ev.creadoPor.name ?? '—'}</span>
                    <Link
                      href={`/proyectos/evidencias/${ev.id}`}
                      className="ml-auto flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Abrir cuaderno <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* ── Registros expandibles ── */}
                {isExpanded && (
                  <RegistrosEvidencia evidenciaId={ev.id} jornada={ev.jornada} />
                )}

                {esAdmin && (
                  <div className="px-4 pb-2 flex justify-end border-t border-gray-100 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setConfirmEliminar(ev.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── AlertDialog: Confirmar eliminar ─────────────── */}
      <AlertDialog
        open={confirmEliminar !== null}
        onOpenChange={(open) => !open && setConfirmEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta evidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también todos los registros y fotos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminarMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirmEliminar) eliminarMutation.mutate(confirmEliminar)
              }}
              disabled={eliminarMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminarMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Eliminando…</>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Nueva evidencia ──────────────────────── */}
      <Dialog open={dialogAbrir} onOpenChange={setDialogAbrir}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Abrir evidencia técnica</DialogTitle>
            <DialogDescription>
              Selecciona la jornada de campo. Si ya existe evidencia para esa jornada, te llevamos a ella.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 overflow-y-auto flex-1 min-h-0">
            <SelectorJornada
              value={jornadaSel?.id ?? null}
              onChange={(_id, j) => setJornadaSel(j)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbrir(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => jornadaSel && abrirEvidenciaMutation.mutate(jornadaSel.id)}
              disabled={!jornadaSel || abrirEvidenciaMutation.isPending}
            >
              {abrirEvidenciaMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Abriendo…</>
              ) : jornadaSel?.evidenciaAvance ? (
                <><ExternalLink className="h-4 w-4 mr-1" /> Ir a evidencia</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" /> Abrir evidencia</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
