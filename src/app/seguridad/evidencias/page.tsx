'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
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
import { SelectorJornada, type JornadaActiva } from '@/components/seguridad/registros/SelectorJornada'
import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'
import { rangoSemanaIso } from '@/lib/validators/reporteSeguridad'
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
  tipoCount: Partial<Record<TipoRegistroSeguridad, number>>
}

interface ProyectoOpt {
  id: string
  codigo: string
  nombre: string
}

const TIPO_COLOR: Record<TipoRegistroSeguridad, string> = {
  charla: 'bg-blue-100 text-blue-700 border-blue-200',
  inspeccion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  observacion: 'bg-amber-100 text-amber-700 border-amber-200',
  incidente: 'bg-red-100 text-red-700 border-red-200',
  actividad_general: 'bg-gray-100 text-gray-700 border-gray-200',
  riesgo_critico: 'bg-rose-100 text-rose-700 border-rose-200',
  medio_ambiente: 'bg-teal-100 text-teal-700 border-teal-200',
  prevencion_salud: 'bg-violet-100 text-violet-700 border-violet-200',
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

export default function EvidenciasListaPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const esAdmin = session?.user?.role === 'admin'

  // Query params (de reporte semanal): proyectoId, semanaIso, tipo, reporteId
  const proyectoIdParam = searchParams.get('proyectoId') ?? ''
  const semanaIsoParam = searchParams.get('semanaIso') ?? ''
  const tipoParam = searchParams.get('tipo') ?? ''
  const reporteIdParam = searchParams.get('reporteId') ?? ''

  // Si vino con semanaIso, derivar rango
  const rangoSemana = useMemo(() => {
    if (!semanaIsoParam) return null
    try {
      const { fechaInicio, fechaFin } = rangoSemanaIso(semanaIsoParam)
      return {
        fechaDesde: fechaInicio.toISOString().slice(0, 10),
        fechaHasta: fechaFin.toISOString().slice(0, 10),
      }
    } catch {
      return null
    }
  }, [semanaIsoParam])

  const [filtroProyecto, setFiltroProyecto] = useState(proyectoIdParam)
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(rangoSemana?.fechaDesde ?? hace7DiasISO())
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(rangoSemana?.fechaHasta ?? hoyISO())
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'abierta' | 'cerrada'>('todos')

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
    queryKey: ['seguridad', 'evidencias', queryString],
    queryFn: async () => {
      const url = `/api/seguridad/evidencias${queryString ? `?${queryString}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar evidencias')
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  const abrirEvidenciaMutation = useMutation({
    mutationFn: async (jornadaId: string) => {
      const res = await fetch('/api/seguridad/evidencias', {
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
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencias'] })
      const params = new URLSearchParams()
      if (tipoParam) params.set('tipo', tipoParam)
      if (reporteIdParam) params.set('reporteId', reporteIdParam)
      const qs = params.toString()
      router.push(`/seguridad/evidencias/${ev.id}${qs ? `?${qs}` : ''}`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al abrir evidencia'),
  })

  const eliminarMutation = useMutation({
    mutationFn: async (evidenciaId: string) => {
      const res = await fetch(`/api/seguridad/evidencias/${evidenciaId}`, {
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
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencias'] })
      setConfirmEliminar(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  // Auto-abrir dialog si vino del reporte semanal
  useEffect(() => {
    if (proyectoIdParam && rangoSemana) {
      setDialogAbrir(true)
    }
  }, [proyectoIdParam, rangoSemana])

  const evidencias = evidenciasQuery.data ?? []

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-600" />
            Evidencias de seguridad
          </h1>
          <p className="text-sm text-muted-foreground">
            Una evidencia por jornada de campo · agrupa todas las actividades del día
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
          {evidencias.map((ev) => (
            <div
              key={ev.id}
              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              <Link href={`/seguridad/evidencias/${ev.id}`} className="block px-4 py-3 space-y-2">
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
                  </div>
                </div>

                {Object.keys(ev.tipoCount).length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {(Object.entries(ev.tipoCount) as [TipoRegistroSeguridad, number][]).map(
                      ([tipo, count]) => (
                        <span
                          key={tipo}
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded border font-medium',
                            TIPO_COLOR[tipo],
                          )}
                        >
                          {TIPO_REGISTRO_LABELS[tipo]}
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
                  <span className="ml-auto">Abierta por {ev.creadoPor.name ?? '—'}</span>
                </div>
              </Link>

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
          ))}
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
            <DialogTitle>Abrir evidencia de seguridad</DialogTitle>
            <DialogDescription>
              Selecciona la jornada de campo. Si ya existe evidencia para esa jornada, te llevamos a ella.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 overflow-y-auto flex-1 min-h-0">
            <SelectorJornada
              value={jornadaSel?.id ?? null}
              onChange={(_id, j) => setJornadaSel(j)}
              filtroProyectoId={proyectoIdParam || undefined}
              filtroFechaDesde={rangoSemana?.fechaDesde}
              filtroFechaHasta={rangoSemana?.fechaHasta}
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
              ) : jornadaSel?.evidenciaSeguridad ? (
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
