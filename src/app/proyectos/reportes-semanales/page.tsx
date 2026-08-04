'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { CalendarDays, ExternalLink, FileBarChart, Loader2, Plus, Trash2, User, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { estadoReporteAvanceEnum, ESTADO_REPORTE_AVANCE_LABELS } from '@/lib/validators/reporteAvance'
import { formatearSemanaIso } from '@/lib/utils/isoWeek'
import { cn } from '@/lib/utils'

interface ProyectoMin {
  id: string
  codigo: string
  nombre: string
}

interface ReporteListItem {
  id: string
  semanaIso: string
  estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado'
  numero: number | null
  createdAt: string
  proyecto: { id: string; codigo: string; nombre: string }
  autor: { id: string; name: string | null }
  aprobador: { id: string; name: string | null } | null
}

// Reporte embebido en la vista semana a semana (sin `proyecto`: ya está fijo por el filtro)
interface ReporteEnSemana {
  id: string
  estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado'
  numero: number | null
  createdAt: string
  autor: { id: string; name: string | null }
  aprobador: { id: string; name: string | null } | null
}

interface SemanaRango {
  semanaIso: string
  weekStart: string
  weekEnd: string
  reporte: ReporteEnSemana | null
  jornadasCount: number
  evidenciasCount: number
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hace1MesISO() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatFechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' })

const ESTADO_COLOR: Record<ReporteListItem['estado'], string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviado: 'bg-blue-100 text-blue-700 border-blue-200',
  aprobado: 'bg-green-100 text-green-700 border-green-200',
  rechazado: 'bg-red-100 text-red-700 border-red-200',
}

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })

export default function ReportesAvanceListaPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const isBypass = ['admin', 'gerente', 'gestor'].includes(role)

  const [filtroProyectoId, setFiltroProyectoId] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(hace1MesISO())
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(hoyISO())

  const [dialogNuevo, setDialogNuevo] = useState(false)
  const [nuevoProyectoId, setNuevoProyectoId] = useState('')
  const [nuevaSemana, setNuevaSemana] = useState(() => formatearSemanaIso(new Date()))
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)

  // Proyectos para los selects
  const queryProyectos = useQuery<ProyectoMin[]>({
    queryKey: ['proyectos', 'lista-min'],
    queryFn: async () => {
      const res = await fetch('/api/proyecto', { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar proyectos')
      const data = await res.json()
      const arr: ProyectoMin[] = data.proyectos ?? data
      return arr.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre }))
    },
    staleTime: 5 * 60 * 1000,
  })
  const proyectos = queryProyectos.data ?? []

  // Vista "Todos los proyectos": lista plana de reportes existentes, filtrable
  // por rango de fechas (solape con el periodo del reporte) y estado.
  const queryString = useMemo(() => {
    const sp = new URLSearchParams()
    if (filtroEstado) sp.set('estado', filtroEstado)
    if (filtroFechaDesde) sp.set('fechaDesde', filtroFechaDesde)
    if (filtroFechaHasta) sp.set('fechaHasta', filtroFechaHasta)
    return sp.toString()
  }, [filtroEstado, filtroFechaDesde, filtroFechaHasta])

  const query = useQuery<ReporteListItem[]>({
    queryKey: ['proyectos', 'reportes-avance', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/proyectos/reportes-semanales${queryString ? `?${queryString}` : ''}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
    enabled: !filtroProyectoId,
    staleTime: 30 * 1000,
  })
  const reportes = query.data ?? []

  // Vista por proyecto: una fila por semana ISO del rango (con o sin reporte).
  const rangoQueryString = useMemo(() => {
    const sp = new URLSearchParams()
    sp.set('proyectoId', filtroProyectoId)
    sp.set('fechaDesde', filtroFechaDesde)
    sp.set('fechaHasta', filtroFechaHasta)
    if (filtroEstado) sp.set('estado', filtroEstado)
    return sp.toString()
  }, [filtroProyectoId, filtroFechaDesde, filtroFechaHasta, filtroEstado])

  const queryRango = useQuery<SemanaRango[]>({
    queryKey: ['proyectos', 'reportes-avance-rango', rangoQueryString],
    queryFn: async () => {
      const res = await fetch(`/api/proyectos/reportes-semanales/rango?${rangoQueryString}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
    enabled: !!filtroProyectoId,
    staleTime: 30 * 1000,
  })
  const semanasRango = queryRango.data ?? []

  const crearMutation = useMutation({
    mutationFn: async (input: { proyectoId: string; semanaIso: string }) => {
      const res = await fetch('/api/proyectos/reportes-semanales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo crear el reporte')
      }
      return (await res.json()) as { id: string }
    },
    onSuccess: (rep) => {
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'reportes-avance'] })
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'reportes-avance-rango'] })
      setDialogNuevo(false)
      router.push(`/proyectos/reportes-semanales/${rep.id}`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al crear reporte'),
  })

  const eliminarMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al eliminar')
      }
    },
    onSuccess: () => {
      toast.success('Reporte eliminado')
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'reportes-avance'] })
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'reportes-avance-rango'] })
      setConfirmEliminar(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
          <FileBarChart className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">Reportes semanales de avance</h1>
          <p className="text-xs text-muted-foreground">Reporte de avance del proyecto por semana ISO</p>
        </div>
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setDialogNuevo(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo reporte
        </Button>
      </div>

      {/* ── Filtros ── */}
      <div className="flex gap-2 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-xs">Proyecto</Label>
          <Select value={filtroProyectoId || 'todos'} onValueChange={(v) => setFiltroProyectoId(v === 'todos' ? '' : v)}>
            <SelectTrigger className="w-60 h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proyectos</SelectItem>
              {proyectos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Estado</Label>
          <Select value={filtroEstado || 'todos'} onValueChange={(v) => setFiltroEstado(v === 'todos' ? '' : v)}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {estadoReporteAvanceEnum.options.map((e) => (
                <SelectItem key={e} value={e}>{ESTADO_REPORTE_AVANCE_LABELS[e]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      {!filtroProyectoId && (
        <p className="text-xs text-muted-foreground -mt-2">
          Selecciona un proyecto para ver el detalle semana a semana (con las semanas sin reporte que tuvieron actividad).
        </p>
      )}

      {/* ── Lista ── */}
      {!filtroProyectoId ? (
        // Vista "Todos los proyectos": solo reportes que ya existen.
        query.isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}</div>
        ) : query.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            No se pudieron cargar los reportes.
          </div>
        ) : reportes.length === 0 ? (
          <div className="rounded-md border border-dashed py-12 text-center space-y-2">
            <FileBarChart className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">No hay reportes</p>
            <p className="text-xs text-muted-foreground">
              Intenta con otro rango de fechas, o selecciona un proyecto para ver semana a semana
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {reportes.map((r) => (
              <Card key={r.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{r.proyecto.nombre}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-gray-200 px-1.5 py-0.5 rounded">
                      {r.proyecto.codigo}
                    </span>
                    <Badge className={cn('text-[10px] border', ESTADO_COLOR[r.estado])}>
                      {ESTADO_REPORTE_AVANCE_LABELS[r.estado]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> {r.semanaIso}
                      {r.numero != null && ` · N° ${String(r.numero).padStart(4, '0')}`}
                    </span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {r.autor.name ?? '—'}</span>
                    {r.aprobador && <span>Aprob.: {r.aprobador.name ?? '—'}</span>}
                    <span>Creado {formatFecha(r.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/proyectos/reportes-semanales/${r.id}`}>
                    <Button variant="outline" size="sm" className="h-8">
                      Abrir <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                  {isBypass && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setConfirmEliminar(r.id)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : queryRango.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}</div>
      ) : queryRango.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudieron cargar las semanas.
        </div>
      ) : semanasRango.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center space-y-2">
          <FileBarChart className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">No hay semanas en este rango</p>
          <p className="text-xs text-muted-foreground">Ajusta las fechas Desde/Hasta</p>
        </div>
      ) : (
        // Vista por proyecto: una fila por cada semana ISO del rango, sin huecos.
        <div className="space-y-2">
          {semanasRango.map((s) => {
            const creandoEstaSemana = crearMutation.isPending && crearMutation.variables?.semanaIso === s.semanaIso
            return (
              <Card
                key={s.semanaIso}
                className={cn(
                  'p-3 flex items-center gap-3',
                  !s.reporte && s.jornadasCount === 0 && 'bg-gray-50/70 border-dashed',
                )}
              >
                <div className="w-24 shrink-0 text-xs">
                  <div className="font-semibold">{formatFechaCorta(s.weekStart)}–{formatFechaCorta(s.weekEnd)}</div>
                  <div className="text-muted-foreground">{s.semanaIso}</div>
                </div>

                {s.reporte ? (
                  <>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn('text-[10px] border', ESTADO_COLOR[s.reporte.estado])}>
                          {ESTADO_REPORTE_AVANCE_LABELS[s.reporte.estado]}
                        </Badge>
                        {s.reporte.numero != null && (
                          <span className="text-[11px] text-muted-foreground">N° {String(s.reporte.numero).padStart(4, '0')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {s.reporte.autor.name ?? '—'}</span>
                        {s.reporte.aprobador && <span>Aprob.: {s.reporte.aprobador.name ?? '—'}</span>}
                        <span>Creado {formatFecha(s.reporte.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/proyectos/reportes-semanales/${s.reporte.id}`}>
                        <Button variant="outline" size="sm" className="h-8">
                          Abrir <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                      {isBypass && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setConfirmEliminar(s.reporte!.id)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </>
                ) : s.jornadasCount > 0 ? (
                  <>
                    <div className="flex-1 min-w-0 flex items-center gap-2 text-xs text-amber-700">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Sin reporte — {s.jornadasCount} jornada{s.jornadasCount !== 1 && 's'}
                        {s.evidenciasCount > 0 && ` (${s.evidenciasCount} con evidencia)`} esta semana
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-orange-300 text-orange-700 hover:bg-orange-50 shrink-0"
                      disabled={creandoEstaSemana}
                      onClick={() => crearMutation.mutate({ proyectoId: filtroProyectoId, semanaIso: s.semanaIso })}
                    >
                      {creandoEstaSemana
                        ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Creando…</>
                        : <><Plus className="h-3.5 w-3.5 mr-1" /> Crear reporte</>}
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 text-xs text-muted-foreground">Sin avance esta semana</div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Dialog: nuevo reporte ── */}
      <Dialog open={dialogNuevo} onOpenChange={setDialogNuevo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo reporte de avance</DialogTitle>
            <DialogDescription>
              Selecciona el proyecto y la semana. Si ya existe un reporte para esa semana, te llevamos a él.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Proyecto</Label>
              <Select value={nuevoProyectoId} onValueChange={setNuevoProyectoId}>
                <SelectTrigger><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
                <SelectContent>
                  {proyectos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nueva-semana" className="text-sm">Semana ISO</Label>
              <Input
                id="nueva-semana"
                type="week"
                value={nuevaSemana}
                onChange={(e) => setNuevaSemana(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Formato {nuevaSemana || 'YYYY-Www'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevo(false)}>Cancelar</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!nuevoProyectoId || !nuevaSemana || crearMutation.isPending}
              onClick={() => crearMutation.mutate({ proyectoId: nuevoProyectoId, semanaIso: nuevaSemana })}
            >
              {crearMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creando…</>
                : <><Plus className="h-4 w-4 mr-1" /> Crear reporte</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminar ── */}
      <AlertDialog open={confirmEliminar !== null} onOpenChange={(open) => { if (!open) setConfirmEliminar(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reporte de avance?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el reporte con toda su narrativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminarMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={eliminarMutation.isPending}
              onClick={() => { if (confirmEliminar) eliminarMutation.mutate(confirmEliminar) }}
            >
              {eliminarMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
