'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Gauge,
  Image as ImageIcon,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Save,
  Trash2,
  User,
  Users,
  Wrench,
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

import { FotosUploader, type FotoLocal } from '@/components/proyectos/evidencias/FotosUploader'
import {
  crearRegistroAvanceSchema,
  TIPO_REGISTRO_AVANCE_LABELS,
  SECCIONES_REPORTE,
  type CrearRegistroAvanceInput,
  type TipoRegistroAvance,
} from '@/lib/validators/registroAvance'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FotoLista {
  id: string
  nombreArchivo: string
  orden: number
}

interface RegistroLista {
  id: string
  tipo: TipoRegistroAvance
  descripcion: string
  disciplina: string | null
  proyectoTareaId: string | null
  porcentajeAvance: number | null
  observaciones: string | null
  createdAt: string
  autor: { id: string; name: string | null }
  proyectoTarea: { id: string; nombre: string } | null
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

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_COLOR: Record<TipoRegistroAvance, string> = {
  avance_general: 'bg-blue-100 text-blue-700 border-blue-200',
  montaje_instalacion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  conexionado_electrico: 'bg-amber-100 text-amber-700 border-amber-200',
  instrumentacion: 'bg-violet-100 text-violet-700 border-violet-200',
  pruebas_comisionamiento: 'bg-teal-100 text-teal-700 border-teal-200',
  inspeccion_calidad: 'bg-rose-100 text-rose-700 border-rose-200',
}

const TIPO_BORDER_L: Record<TipoRegistroAvance, string> = {
  avance_general: 'border-l-blue-400',
  montaje_instalacion: 'border-l-emerald-500',
  conexionado_electrico: 'border-l-amber-400',
  instrumentacion: 'border-l-violet-500',
  pruebas_comisionamiento: 'border-l-teal-500',
  inspeccion_calidad: 'border-l-rose-500',
}

const SIN_TAREA = '__none__'

const formatFechaLarga = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

const formatHora = (s: string) =>
  new Date(s).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

async function subirFoto(registroId: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/proyectos/registros-evidencia/${registroId}/fotos`, {
    method: 'POST', body: fd, credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Error al subir foto')
  }
  return res.json()
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EvidenciaAvancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  const [confirmCerrar, setConfirmCerrar] = useState(false)
  const [confirmEliminarRegistro, setConfirmEliminarRegistro] = useState<string | null>(null)
  const [cuadrillaAbierta, setCuadrillaAbierta] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoRegistro, setEditandoRegistro] = useState<RegistroLista | null>(null)
  const [fotosExistentes, setFotosExistentes] = useState<FotoLista[]>([])
  const [fotos, setFotos] = useState<FotoLocal[]>([])
  const [toggledSections, setToggledSections] = useState<Set<TipoRegistroAvance>>(new Set())

  const query = useQuery<EvidenciaDetalle>({
    queryKey: ['proyectos', 'evidencia', id],
    queryFn: async () => {
      const res = await fetch(`/api/proyectos/evidencias/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
  })

  const form = useForm<CrearRegistroAvanceInput>({
    resolver: zodResolver(crearRegistroAvanceSchema),
    defaultValues: {
      evidenciaAvanceId: id,
      tipo: 'avance_general',
      descripcion: '',
      disciplina: null,
      proyectoTareaId: null,
      porcentajeAvance: null,
      observaciones: null,
    },
  })

  const tipo = form.watch('tipo')
  const proyectoTareaSel = form.watch('proyectoTareaId')

  // ── Mutations ──────────────────────────────────────────────────────────────

  const crearMutation = useMutation({
    mutationFn: async (input: CrearRegistroAvanceInput) => {
      const res = await fetch('/api/proyectos/registros-evidencia', {
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

  const editarMutation = useMutation({
    mutationFn: async ({ registroId, input }: { registroId: string; input: Partial<CrearRegistroAvanceInput> }) => {
      const res = await fetch(`/api/proyectos/registros-evidencia/${registroId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo actualizar el registro')
      }
      return (await res.json()) as { id: string }
    },
  })

  const eliminarFotoMutation = useMutation({
    mutationFn: async ({ registroId, fotoId }: { registroId: string; fotoId: string }) => {
      const res = await fetch(`/api/proyectos/registros-evidencia/${registroId}/fotos/${fotoId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo eliminar la foto')
      }
    },
    onSuccess: (_data, { fotoId }) => {
      setFotosExistentes((prev) => prev.filter((f) => f.id !== fotoId))
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencia', id] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar foto'),
  })

  const onSubmit = async (data: CrearRegistroAvanceInput) => {
    try {
      let registroId: string

      if (editandoRegistro) {
        // Modo edición
        const actualizado = await editarMutation.mutateAsync({
          registroId: editandoRegistro.id,
          input: {
            tipo: data.tipo,
            descripcion: data.descripcion,
            disciplina: data.disciplina ?? null,
            proyectoTareaId: data.proyectoTareaId ?? null,
            porcentajeAvance: data.porcentajeAvance ?? null,
            observaciones: data.observaciones ?? null,
          },
        })
        registroId = actualizado.id
        toast.success('Registro actualizado')
      } else {
        // Modo creación
        const creado = await crearMutation.mutateAsync({
          ...data,
          evidenciaAvanceId: id,
        })
        registroId = creado.id
        toast.success('Registro agregado')
      }

      let fallos = 0
      for (const foto of fotos) {
        try { await subirFoto(registroId, foto.file) }
        catch { fallos++ }
      }
      if (fallos > 0) {
        toast.warning(`${fallos} foto${fallos > 1 ? 's' : ''} no se pudo subir.`)
      }

      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencia', id] })
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencias'] })
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'registros-ev'] })
      form.reset({
        evidenciaAvanceId: id,
        tipo: data.tipo,
        descripcion: '',
        disciplina: null,
        proyectoTareaId: null,
        porcentajeAvance: null,
        observaciones: null,
      })
      setFotos([])
      setEditandoRegistro(null)
      setModalAbierto(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar registro')
    }
  }

  const cerrarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proyectos/evidencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: 'cerrada' }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo cerrar')
    },
    onSuccess: () => {
      toast.success('Evidencia cerrada')
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencia', id] })
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencias'] })
      setConfirmCerrar(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al cerrar'),
  })

  const reabrirMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proyectos/evidencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado: 'abierta' }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo reabrir')
    },
    onSuccess: () => {
      toast.success('Evidencia reabierta')
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencia', id] })
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencias'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al reabrir'),
  })

  const eliminarRegistroMutation = useMutation({
    mutationFn: async (registroId: string) => {
      const res = await fetch(`/api/proyectos/registros-evidencia/${registroId}`, {
        method: 'DELETE', credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo eliminar')
    },
    onSuccess: () => {
      toast.success('Registro eliminado')
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'evidencia', id] })
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'registros-ev'] })
      setConfirmEliminarRegistro(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  // ── Loading / error ────────────────────────────────────────────────────────

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
        <Link href="/proyectos/evidencias">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        </Link>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar la evidencia.
        </div>
      </div>
    )
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const ev = query.data
  const role = session?.user?.role
  const isBypass = role === 'admin' || role === 'gerente' || role === 'gestor'
  const jornadaActiva = ['iniciado', 'pendiente'].includes(ev.jornada.estado)
  const evidenciaAbierta = ev.estado === 'abierta'
  const puedeEscribir = isBypass || (jornadaActiva && evidenciaAbierta)
  const puedeCerrar = evidenciaAbierta && (isBypass || ev.creadoPor.id === session?.user?.id)
  const totalTrabajadores = new Set(
    ev.jornada.tareas.flatMap((t) => t.miembros.map((m) => m.usuarioId)),
  ).size
  const enviando = form.formState.isSubmitting || crearMutation.isPending || editarMutation.isPending

  // Tareas de la jornada con proyectoTarea (para el select del modal)
  const tareasJornada = ev.jornada.tareas
    .filter((t): t is JornadaTarea & { proyectoTarea: { id: string; nombre: string } } => !!t.proyectoTarea)
    .map((t) => t.proyectoTarea)

  /** Secciones con registros abren por default; vacías cierran. El usuario puede invertir. */
  const isSectionOpen = (tipoSec: TipoRegistroAvance) => {
    const hasRecords = ev.registros.some((r) => r.tipo === tipoSec)
    const toggled = toggledSections.has(tipoSec)
    return hasRecords ? !toggled : toggled
  }

  const toggleSection = (tipoSec: TipoRegistroAvance) => {
    setToggledSections((prev) => {
      const next = new Set(prev)
      if (next.has(tipoSec)) next.delete(tipoSec)
      else next.add(tipoSec)
      return next
    })
  }

  const openModal = (tipoInicial: TipoRegistroAvance) => {
    form.reset({
      evidenciaAvanceId: id,
      tipo: tipoInicial,
      descripcion: '',
      disciplina: null,
      proyectoTareaId: null,
      porcentajeAvance: null,
      observaciones: null,
    })
    setFotos([])
    setEditandoRegistro(null)
    setModalAbierto(true)
  }

  const openEditModal = (r: RegistroLista) => {
    form.reset({
      evidenciaAvanceId: id,
      tipo: r.tipo,
      descripcion: r.descripcion,
      disciplina: r.disciplina ?? null,
      proyectoTareaId: r.proyectoTareaId ?? null,
      porcentajeAvance: r.porcentajeAvance ?? null,
      observaciones: r.observaciones ?? null,
    })
    setFotos([])
    setFotosExistentes(r.fotos)
    setEditandoRegistro(r)
    setModalAbierto(true)
  }

  const seccionesConRegistros = SECCIONES_REPORTE.filter((t) =>
    ev.registros.some((r) => r.tipo === t),
  ).length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-3 sm:p-4 space-y-3 max-w-3xl">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Link href="/proyectos/evidencias">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-bold truncate">{ev.jornada.proyecto.nombre}</h1>
          <p className="text-xs text-muted-foreground font-mono">{ev.jornada.proyecto.codigo}</p>
        </div>
      </div>

      {/* ── Header card ──────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-xs border', evidenciaAbierta
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-gray-200 text-gray-700 border-gray-300')}>
                {evidenciaAbierta
                  ? <LockOpen className="h-3 w-3 mr-1" />
                  : <Lock className="h-3 w-3 mr-1" />}
                Evidencia {ev.estado}
              </Badge>
              <Badge className={cn('text-xs border capitalize', jornadaActiva
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-gray-100 text-gray-600 border-gray-200')}>
                Jornada {ev.jornada.estado}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {puedeCerrar && (
                <Button variant="outline" size="sm" className="h-8"
                  onClick={() => setConfirmCerrar(true)} disabled={cerrarMutation.isPending}>
                  <Lock className="h-3.5 w-3.5 mr-1" /> Cerrar evidencia
                </Button>
              )}
              {!evidenciaAbierta && isBypass && (
                <Button variant="outline" size="sm" className="h-8"
                  onClick={() => reabrirMutation.mutate()} disabled={reabrirMutation.isPending}>
                  <LockOpen className="h-3.5 w-3.5 mr-1" /> Reabrir
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium capitalize">{formatFechaLarga(ev.jornada.fechaTrabajo)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">Supervisor:</span>
              <span className="font-medium">{ev.jornada.supervisor.name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">Abierta por:</span>
              <span className="font-medium">{ev.creadoPor.name ?? '—'}</span>
            </div>
            {ev.fechaCierre && (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs">Cerrada:</span>
                <span className="font-medium">{formatHora(ev.fechaCierre)}</span>
              </div>
            )}
          </div>

          {ev.observaciones && (
            <div className="text-sm border-t pt-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Observaciones</p>
              <p className="whitespace-pre-wrap">{ev.observaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Cuadrilla card (colapsada por default) ───────────── */}
      {ev.jornada.tareas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/40">
          <button type="button" onClick={() => setCuadrillaAbierta((v) => !v)} className="w-full text-left">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-700" />
                <span className="text-xs font-semibold text-orange-700">Cuadrilla y tareas</span>
                <span className="text-[11px] text-muted-foreground">
                  {totalTrabajadores} trabajador{totalTrabajadores === 1 ? '' : 'es'}
                  {' · '}{ev.jornada.tareas.length} tarea{ev.jornada.tareas.length === 1 ? '' : 's'}
                </span>
              </div>
              {cuadrillaAbierta
                ? <ChevronUp className="h-4 w-4 text-orange-700" />
                : <ChevronDown className="h-4 w-4 text-orange-700" />}
            </div>
          </button>
          {cuadrillaAbierta && (
            <CardContent className="p-3 pt-0 space-y-1">
              {ev.jornada.tareas.map((t) => (
                <div key={t.id} className="text-xs leading-snug">
                  <span className="font-medium">
                    • {t.proyectoTarea?.nombre ?? t.nombreTareaExtra ?? 'Tarea'}
                  </span>
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

      {/* ── Aviso solo lectura ────────────────────────────────── */}
      {!puedeEscribir && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {!evidenciaAbierta
            ? 'Esta evidencia está cerrada. No se pueden agregar más registros.'
            : 'La jornada está aprobada o rechazada. No se pueden agregar más registros.'}
        </div>
      )}

      {/* ── Secciones en orden del reporte ───────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-orange-600" />
            Registros ({ev.registros.length})
            <span className="text-[11px] font-normal text-muted-foreground">
              {seccionesConRegistros}/{SECCIONES_REPORTE.length} tipos con registro
            </span>
          </h2>
        </div>

        {SECCIONES_REPORTE.map((tipoSec) => {
          const registrosTipo = ev.registros.filter((r) => r.tipo === tipoSec)
          const open = isSectionOpen(tipoSec)
          const tieneRegistros = registrosTipo.length > 0

          return (
            <div
              key={tipoSec}
              className={cn(
                'border rounded-lg overflow-hidden',
                tieneRegistros ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50/40',
              )}
            >
              {/* Cabecera de sección */}
              <div className="flex items-center gap-1 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleSection(tipoSec)}
                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                >
                  {tieneRegistros
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : (open
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  <Badge className={cn('text-[10px] border shrink-0', TIPO_COLOR[tipoSec])}>
                    {TIPO_REGISTRO_AVANCE_LABELS[tipoSec]}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {tieneRegistros
                      ? `${registrosTipo.length} registro${registrosTipo.length > 1 ? 's' : ''}`
                      : 'sin registros'}
                  </span>
                </button>
                {puedeEscribir && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs shrink-0"
                    onClick={() => openModal(tipoSec)}
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> Agregar
                  </Button>
                )}
              </div>

              {/* Contenido de sección */}
              {open && (
                <div className="border-t border-gray-100">
                  {registrosTipo.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground italic">
                      {puedeEscribir
                        ? 'Sin registros — usa "+ Agregar" para completar esta sección.'
                        : 'Sin registros de este tipo.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {registrosTipo.map((r) => (
                        <div
                          key={r.id}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 border-l-2',
                            TIPO_BORDER_L[r.tipo],
                          )}
                        >
                          {/* Thumbnail */}
                          <div className="h-14 w-14 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center">
                            {r.fotos[0] ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={`/api/proyectos/registros-evidencia/fotos/${r.fotos[0].id}/contenido`}
                                alt={r.fotos[0].nombreArchivo}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2 leading-snug">{r.descripcion}</p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                              <span>{formatHora(r.createdAt)}</span>
                              <span>·</span>
                              <span>{r.autor.name ?? '—'}</span>
                              {r.disciplina && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-0.5">
                                    <Wrench className="h-3 w-3" /> {r.disciplina}
                                  </span>
                                </>
                              )}
                              {r.porcentajeAvance != null && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-0.5">
                                    <Gauge className="h-3 w-3" /> {r.porcentajeAvance}%
                                  </span>
                                </>
                              )}
                              {r.proyectoTarea && (
                                <>
                                  <span>·</span>
                                  <span className="truncate max-w-[140px]">{r.proyectoTarea.nombre}</span>
                                </>
                              )}
                              {r.fotos.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-0.5">
                                    <ImageIcon className="h-3 w-3" /> {r.fotos.length}
                                  </span>
                                </>
                              )}
                            </div>
                            {r.observaciones && (
                              <p className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-1">
                                {r.observaciones}
                              </p>
                            )}
                          </div>

                          {/* Editar / Eliminar */}
                          {puedeEscribir && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => openEditModal(r)}
                                aria-label="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setConfirmEliminarRegistro(r.id)}
                                aria-label="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modal: agregar/editar registro ────────────────────── */}
      <Dialog open={modalAbierto} onOpenChange={(open) => { if (!enviando) { setModalAbierto(open); if (!open) { setEditandoRegistro(null); setFotosExistentes([]) } } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editandoRegistro
                ? <Pencil className="h-4 w-4 text-orange-600" />
                : <Plus className="h-4 w-4 text-orange-600" />}
              {editandoRegistro ? 'Editar registro' : 'Agregar registro'}
              <Badge className={cn('text-[10px] border ml-1', TIPO_COLOR[tipo])}>
                {TIPO_REGISTRO_AVANCE_LABELS[tipo]}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="descripcion-modal" className="text-sm">Descripción</Label>
              <Textarea
                id="descripcion-modal"
                placeholder="Qué se ejecutó, dónde, alcance…"
                rows={3}
                disabled={enviando}
                {...form.register('descripcion')}
              />
              {form.formState.errors.descripcion && (
                <p className="text-xs text-red-600">{form.formState.errors.descripcion.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="disciplina-modal" className="text-sm">Disciplina (opcional)</Label>
                <Input
                  id="disciplina-modal"
                  placeholder="Ej. Mecánica, Eléctrica…"
                  disabled={enviando}
                  {...form.register('disciplina', {
                    setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
                  })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="porcentaje-modal" className="text-sm">% Avance (opcional)</Label>
                <Input
                  id="porcentaje-modal"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="0–100"
                  disabled={enviando}
                  {...form.register('porcentajeAvance', {
                    setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                  })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tarea-modal" className="text-sm">Tarea del cronograma (opcional)</Label>
              <Select
                value={proyectoTareaSel ?? SIN_TAREA}
                onValueChange={(v) =>
                  form.setValue('proyectoTareaId', v === SIN_TAREA ? null : v, { shouldDirty: true })
                }
                disabled={enviando}
              >
                <SelectTrigger id="tarea-modal">
                  <SelectValue placeholder="Sin tarea" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_TAREA}>Sin tarea</SelectItem>
                  {tareasJornada.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obs-modal" className="text-sm">Observaciones (opcional)</Label>
              <Textarea
                id="obs-modal"
                placeholder="Notas adicionales"
                rows={2}
                disabled={enviando}
                {...form.register('observaciones', {
                  setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
                })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Fotos</Label>

              {/* Fotos existentes (solo en modo edición) */}
              {editandoRegistro && fotosExistentes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {fotosExistentes.map((f) => (
                    <div key={f.id} className="relative h-20 w-20 rounded-md overflow-hidden border border-gray-200 bg-muted group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/proyectos/registros-evidencia/fotos/${f.id}/contenido`}
                        alt={f.nombreArchivo}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        disabled={eliminarFotoMutation.isPending}
                        onClick={() => eliminarFotoMutation.mutate({ registroId: editandoRegistro.id, fotoId: f.id })}
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        aria-label="Eliminar foto"
                      >
                        <span className="text-[11px] font-bold leading-none">✕</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Subir fotos nuevas */}
              {fotosExistentes.length < 3 && (
                <FotosUploader
                  fotos={fotos}
                  onChange={setFotos}
                  max={3 - fotosExistentes.length}
                  disabled={enviando}
                />
              )}
              {editandoRegistro && fotosExistentes.length >= 3 && (
                <p className="text-xs text-muted-foreground">Ya tiene 3 fotos. Elimina una para agregar otra.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" disabled={enviando} onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando} className="bg-orange-600 hover:bg-orange-700">
                {enviando
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando…</>
                  : <><Save className="h-4 w-4 mr-2" /> Guardar</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar cerrar ──────────────────────────────────── */}
      <AlertDialog open={confirmCerrar} onOpenChange={setConfirmCerrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la evidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              No se podrán agregar, editar ni eliminar más registros. Solo admin, gerente o gestor podrán reabrirla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cerrarMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); cerrarMutation.mutate() }}
              disabled={cerrarMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {cerrarMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Cerrando…</>
                : 'Cerrar evidencia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirmar eliminar registro ───────────────────────── */}
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
              {eliminarRegistroMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Eliminando…</>
                : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
