'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  Save,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

import { SelectorTipoRegistro } from '@/components/seguridad/registros/SelectorTipoRegistro'
import { FotosUploader, type FotoLocal } from '@/components/seguridad/registros/FotosUploader'
import {
  crearRegistroSeguridadSchema,
  TIPO_REGISTRO_LABELS,
  type CrearRegistroSeguridadInput,
  type TipoRegistroSeguridad,
} from '@/lib/validators/registroSeguridad'

interface FotoLista {
  id: string
  nombreArchivo: string
  orden: number
}

interface RegistroLista {
  id: string
  tipo: TipoRegistroSeguridad
  descripcion: string
  asistentes: number | null
  observaciones: string | null
  createdAt: string
  ingeniero: { id: string; name: string | null }
  fotos: FotoLista[]
}

interface JornadaTarea {
  id: string
  nombreTareaExtra: string | null
  proyectoTarea: { id: string; nombre: string } | null
  miembros: Array<{
    usuarioId: string
    horas: number
    usuario: { id: string; name: string | null }
  }>
}

interface EvidenciaDetalle {
  id: string
  estado: 'abierta' | 'cerrada'
  observaciones: string | null
  fechaCierre: string | null
  createdAt: string
  jornada: {
    id: string
    fechaTrabajo: string
    estado: string
    ubicacion: string | null
    proyecto: { id: string; codigo: string; nombre: string }
    supervisor: { id: string; name: string | null }
    tareas: JornadaTarea[]
  }
  creadoPor: { id: string; name: string | null }
  registros: RegistroLista[]
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

const TIPO_BORDER: Record<TipoRegistroSeguridad, string> = {
  charla: 'border-l-blue-500',
  inspeccion: 'border-l-green-500',
  observacion: 'border-l-yellow-500',
  incidente: 'border-l-red-500',
  actividad_general: 'border-l-gray-400',
  riesgo_critico: 'border-l-orange-600',
  medio_ambiente: 'border-l-emerald-600',
  prevencion_salud: 'border-l-cyan-500',
}

const formatFechaLarga = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

const formatHora = (s: string) =>
  new Date(s).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

async function subirFoto(registroId: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/seguridad/registros/${registroId}/fotos`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Error al subir foto')
  }
  return res.json()
}

export default function EvidenciaSeguridadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [confirmCerrar, setConfirmCerrar] = useState(false)
  const [confirmEliminarRegistro, setConfirmEliminarRegistro] = useState<string | null>(null)
  const [cuadrillaAbierta, setCuadrillaAbierta] = useState(true)
  const [fotos, setFotos] = useState<FotoLocal[]>([])

  const query = useQuery<EvidenciaDetalle>({
    queryKey: ['seguridad', 'evidencia', id],
    queryFn: async () => {
      const res = await fetch(`/api/seguridad/evidencias/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
  })

  const form = useForm<CrearRegistroSeguridadInput>({
    resolver: zodResolver(crearRegistroSeguridadSchema),
    defaultValues: {
      evidenciaSeguridadId: id,
      tipo: 'charla',
      descripcion: '',
      asistentes: null,
      observaciones: null,
    },
  })

  const tipo = form.watch('tipo')

  const crearMutation = useMutation({
    mutationFn: async (input: CrearRegistroSeguridadInput) => {
      const res = await fetch('/api/seguridad/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo crear el registro')
      }
      return (await res.json()) as { id: string }
    },
  })

  const onSubmit = async (data: CrearRegistroSeguridadInput) => {
    try {
      const creado = await crearMutation.mutateAsync({
        ...data,
        evidenciaSeguridadId: id,
        asistentes: data.tipo === 'charla' ? data.asistentes ?? null : null,
      })

      let fallos = 0
      for (const foto of fotos) {
        try {
          await subirFoto(creado.id, foto.file)
        } catch (err) {
          console.error('Error subiendo foto:', err)
          fallos++
        }
      }

      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencia', id] })
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencias'] })
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registros'] })

      if (fallos > 0) {
        toast.warning(`Registro creado, pero ${fallos} foto${fallos > 1 ? 's' : ''} no se pudo subir.`)
      } else {
        toast.success('Registro agregado')
      }

      // Reset form pero mantener tipo
      form.reset({
        evidenciaSeguridadId: id,
        tipo: data.tipo,
        descripcion: '',
        asistentes: null,
        observaciones: null,
      })
      setFotos([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear registro')
    }
  }

  const cerrarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/seguridad/evidencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: 'cerrada' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo cerrar')
      }
    },
    onSuccess: () => {
      toast.success('Evidencia cerrada')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencia', id] })
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencias'] })
      setConfirmCerrar(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al cerrar'),
  })

  const reabrirMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/seguridad/evidencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: 'abierta' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo reabrir')
      }
    },
    onSuccess: () => {
      toast.success('Evidencia reabierta')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencia', id] })
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencias'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al reabrir'),
  })

  const eliminarRegistroMutation = useMutation({
    mutationFn: async (registroId: string) => {
      const res = await fetch(`/api/seguridad/registros/${registroId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo eliminar')
      }
    },
    onSuccess: () => {
      toast.success('Registro eliminado')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'evidencia', id] })
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registros'] })
      setConfirmEliminarRegistro(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  if (query.isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-3 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Link href="/seguridad/evidencias">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar la evidencia.
        </div>
      </div>
    )
  }

  const ev = query.data
  const role = session?.user?.role
  const isBypass = role === 'admin' || role === 'gerente'
  const jornadaActiva = ['iniciado', 'pendiente'].includes(ev.jornada.estado)
  const evidenciaAbierta = ev.estado === 'abierta'
  const puedeEscribir = isBypass || (jornadaActiva && evidenciaAbierta)
  const puedeCerrar = evidenciaAbierta && (isBypass || ev.creadoPor.id === session?.user?.id)
  const totalTrabajadores = new Set(
    ev.jornada.tareas.flatMap((t) => t.miembros.map((m) => m.usuarioId)),
  ).size

  const enviando = form.formState.isSubmitting || crearMutation.isPending

  return (
    <div className="container mx-auto p-3 sm:p-4 space-y-3 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link href="/seguridad/evidencias">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-bold truncate">{ev.jornada.proyecto.nombre}</h1>
          <p className="text-xs text-muted-foreground font-mono">{ev.jornada.proyecto.codigo}</p>
        </div>
      </div>

      {/* ── Header card ───────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  'text-xs border',
                  evidenciaAbierta
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-gray-200 text-gray-700 border-gray-300',
                )}
              >
                {evidenciaAbierta ? <LockOpen className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                Evidencia {ev.estado}
              </Badge>
              <Badge
                className={cn(
                  'text-xs border capitalize',
                  jornadaActiva
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200',
                )}
              >
                Jornada {ev.jornada.estado}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {puedeCerrar && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setConfirmCerrar(true)}
                  disabled={cerrarMutation.isPending}
                >
                  <Lock className="h-3.5 w-3.5 mr-1" /> Cerrar evidencia
                </Button>
              )}
              {!evidenciaAbierta && isBypass && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => reabrirMutation.mutate()}
                  disabled={reabrirMutation.isPending}
                >
                  <LockOpen className="h-3.5 w-3.5 mr-1" /> Reabrir
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fecha:</span>
              <span className="font-medium capitalize">{formatFechaLarga(ev.jornada.fechaTrabajo)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Supervisor:</span>
              <span className="font-medium">{ev.jornada.supervisor.name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Abierta por:</span>
              <span className="font-medium">{ev.creadoPor.name ?? '—'}</span>
            </div>
            {ev.fechaCierre && (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cerrada:</span>
                <span className="font-medium">{formatFechaLarga(ev.fechaCierre)} {formatHora(ev.fechaCierre)}</span>
              </div>
            )}
          </div>

          {ev.observaciones && (
            <div className="text-sm border-t pt-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Observaciones</span>
              <p className="mt-1 whitespace-pre-wrap">{ev.observaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Cuadrilla card ────────────────────────────────── */}
      {ev.jornada.tareas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/40">
          <button
            type="button"
            onClick={() => setCuadrillaAbierta((v) => !v)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-700" />
                <span className="text-xs font-semibold text-orange-700">Cuadrilla y tareas</span>
                <span className="text-[11px] text-muted-foreground">
                  {totalTrabajadores} trabajador{totalTrabajadores === 1 ? '' : 'es'}
                </span>
              </div>
              {cuadrillaAbierta ? (
                <ChevronUp className="h-4 w-4 text-orange-700" />
              ) : (
                <ChevronDown className="h-4 w-4 text-orange-700" />
              )}
            </div>
          </button>
          {cuadrillaAbierta && (
            <CardContent className="p-3 pt-0 space-y-1">
              {ev.jornada.tareas.map((t) => (
                <div key={t.id} className="text-xs leading-snug">
                  <span className="font-medium">• {t.proyectoTarea?.nombre ?? t.nombreTareaExtra ?? 'Tarea'}</span>
                  {t.miembros.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      — {t.miembros.length} pers · {t.miembros.reduce((s, m) => s + (m.horas ?? 0), 0).toFixed(1)} h
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Lista de registros ────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-orange-600" />
            Evidencias registradas ({ev.registros.length})
          </h2>
        </div>

        {ev.registros.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            Aún no hay evidencias. Agrega la primera con el formulario de abajo.
          </div>
        ) : (
          <div className="space-y-2">
            {ev.registros.map((r) => (
              <Link
                key={r.id}
                href={`/seguridad/registros/${r.id}`}
                className={cn(
                  'flex items-start gap-3 p-3 bg-white border rounded-md hover:bg-orange-50/40 transition-colors border-l-4',
                  TIPO_BORDER[r.tipo],
                )}
              >
                <div className="h-12 w-12 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center">
                  {r.fotos[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/seguridad/registros/fotos/${r.fotos[0].id}/contenido`}
                      alt={r.fotos[0].nombreArchivo}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn('text-[10px] border', TIPO_COLOR[r.tipo])}>
                      {TIPO_REGISTRO_LABELS[r.tipo]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatHora(r.createdAt)} · {r.ingeniero.name ?? '—'}
                    </span>
                  </div>
                  <p className="text-sm mt-1 line-clamp-2">{r.descripcion}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    {r.asistentes != null && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {r.asistentes}
                      </span>
                    )}
                    {r.fotos.length > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> {r.fotos.length}
                      </span>
                    )}
                  </div>
                </div>
                {puedeEscribir && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setConfirmEliminarRegistro(r.id)
                    }}
                    aria-label="Eliminar registro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Formulario inline agregar ─────────────────────── */}
      {puedeEscribir && (
        <Card className="border-orange-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-semibold">Agregar evidencia</h3>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Tipo</Label>
                <SelectorTipoRegistro
                  value={tipo}
                  onChange={(t) => form.setValue('tipo', t as TipoRegistroSeguridad)}
                  disabled={enviando}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descripcion-inline" className="text-sm">Descripción</Label>
                <Textarea
                  id="descripcion-inline"
                  placeholder="Qué se hizo, dónde, con quiénes…"
                  rows={3}
                  disabled={enviando}
                  {...form.register('descripcion')}
                />
                {form.formState.errors.descripcion && (
                  <p className="text-xs text-red-600">{form.formState.errors.descripcion.message}</p>
                )}
              </div>

              {tipo === 'charla' && (
                <div className="space-y-1.5">
                  <Label htmlFor="asistentes-inline" className="text-sm">Asistentes</Label>
                  <Input
                    id="asistentes-inline"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder={totalTrabajadores > 0 ? `Sugerencia: ${totalTrabajadores}` : 'Cantidad'}
                    disabled={enviando}
                    {...form.register('asistentes', {
                      setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                    })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="obs-inline" className="text-sm">Observaciones (opcional)</Label>
                <Textarea
                  id="obs-inline"
                  placeholder="Notas adicionales"
                  rows={2}
                  disabled={enviando}
                  {...form.register('observaciones', {
                    setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
                  })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Fotos (1 a 3)</Label>
                <FotosUploader fotos={fotos} onChange={setFotos} max={3} disabled={enviando} />
              </div>

              <Button
                type="submit"
                disabled={enviando}
                className="w-full bg-orange-600 hover:bg-orange-700 h-11"
              >
                {enviando ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando…</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Agregar evidencia</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!puedeEscribir && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {!evidenciaAbierta
            ? 'Esta evidencia está cerrada. No se pueden agregar más registros.'
            : 'La jornada está aprobada o rechazada. No se pueden agregar más registros.'}
        </div>
      )}

      {/* ── Diálogos ──────────────────────────────────────── */}
      <AlertDialog open={confirmCerrar} onOpenChange={setConfirmCerrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la evidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              No se podrán agregar, editar ni eliminar más registros. Solo admin o gerente podrán reabrirla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cerrarMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                cerrarMutation.mutate()
              }}
              disabled={cerrarMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {cerrarMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Cerrando…</>
              ) : (
                'Cerrar evidencia'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmEliminarRegistro !== null}
        onOpenChange={(open) => !open && setConfirmEliminarRegistro(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              También se eliminarán las fotos asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminarRegistroMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirmEliminarRegistro) eliminarRegistroMutation.mutate(confirmEliminarRegistro)
              }}
              disabled={eliminarRegistroMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminarRegistroMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Eliminando…</>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
