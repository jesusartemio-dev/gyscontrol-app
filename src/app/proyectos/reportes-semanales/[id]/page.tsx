'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft, Camera, CheckCircle, Download, Eye, Gauge, Image as ImageIcon, Loader2, Plus,
  Save, Send, Trash2, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ESTADO_REPORTE_AVANCE_LABELS } from '@/lib/validators/reporteAvance'
import { cn } from '@/lib/utils'
import { CurvaSAvanceChart } from '@/components/proyectos/CurvaSAvanceChart'

// ─── Types (fechas llegan como string por el fetch) ──────────────────────────
type Estado = 'borrador' | 'enviado' | 'aprobado' | 'rechazado'

interface Detalle {
  id: string
  semanaIso: string
  numero: number | null
  estado: Estado
  fechaInicio: string
  fechaFin: string
  fechaCorte: string
  alcanceTexto: string | null
  resumenEjecutivo: string | null
  comentariosHitos: unknown
  variaciones: unknown
  impedimentos: unknown
  notasRevision: string | null
  enviadoAt: string | null
  aprobadoAt: string | null
  rechazadoAt: string | null
  createdAt: string
  proyecto: { id: string; codigo: string; nombre: string; numeroContrato: string | null; descripcion: string | null }
  autor: { id: string; name: string | null }
  aprobador: { id: string; name: string | null } | null
}

interface HitoAgg {
  id: string
  tipo: 'contractual' | 'intermedio'
  nombre: string
  orden: number
  fechaPlan: string | null
  fechaPronostico: string | null
  fechaReal: string | null
  comentario: string | null
}
interface FotoAgg { id: string; leyenda: string | null; registroDescripcion: string; registroTipo: string }
interface FaseAgg { faseId: string; nombre: string; porcentajeAvance: number }
interface ImpedimentoAgg { restriccion: string; responsable: string | null; fechaLimite: string | null }

interface Agregado {
  cabecera: { nombreArchivo: string }
  fotos: FotoAgg[]
  impedimentos: ImpedimentoAgg[]
  avancePorFase: FaseAgg[]
  hitos: HitoAgg[]
  variaciones: { fase: string; causa: string }[]
}

const ESTADO_COLOR: Record<Estado, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviado: 'bg-blue-100 text-blue-700 border-blue-200',
  aprobado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rechazado: 'bg-red-100 text-red-700 border-red-200',
}

const ROLES_REVISION = ['admin', 'gerente', 'gestor']
const ROLES_SNAPSHOT = ['admin', 'gerente', 'gestor', 'proyectos', 'coordinador']

const fechaCorta = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'
const fechaInput = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : '')

function parseComentarios(json: unknown): Record<string, string> {
  const map: Record<string, string> = {}
  if (Array.isArray(json)) {
    for (const x of json) {
      const o = x as { hitoId?: unknown; comentario?: unknown }
      if (o && typeof o.hitoId === 'string') map[o.hitoId] = typeof o.comentario === 'string' ? o.comentario : ''
    }
  }
  return map
}
function parseVariaciones(json: unknown): Record<string, string> {
  const map: Record<string, string> = {}
  if (Array.isArray(json)) {
    for (const x of json) {
      const o = x as { fase?: unknown; causa?: unknown }
      if (o && typeof o.fase === 'string') map[o.fase] = typeof o.causa === 'string' ? o.causa : ''
    }
  }
  return map
}

export default function ReporteAvanceDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const isBypass = ['admin', 'gerente', 'gestor'].includes(role)
  const isRevision = ROLES_REVISION.includes(role)
  const puedeSnapshot = ROLES_SNAPSHOT.includes(role)

  // Estado editable
  const [numero, setNumero] = useState('')
  const [alcanceTexto, setAlcanceTexto] = useState('')
  const [resumenEjecutivo, setResumenEjecutivo] = useState('')
  const [comentariosHitos, setComentariosHitos] = useState<Record<string, string>>({})
  const [variacionesCausa, setVariacionesCausa] = useState<Record<string, string>>({})
  const [impedimentos, setImpedimentos] = useState<{ restriccion: string; responsable: string; fechaLimite: string }[]>([])
  const [seeded, setSeeded] = useState(false)

  const [confirmEnviar, setConfirmEnviar] = useState(false)
  const [confirmAprobar, setConfirmAprobar] = useState(false)
  const [confirmRechazar, setConfirmRechazar] = useState(false)
  const [notasRechazo, setNotasRechazo] = useState('')
  const [descargando, setDescargando] = useState(false)
  const [previsualizando, setPrevisualizando] = useState(false)

  const detalleQuery = useQuery<Detalle>({
    queryKey: ['proyectos', 'reporte-avance', id],
    queryFn: async () => {
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
  })

  const agregadoQuery = useQuery<Agregado>({
    queryKey: ['proyectos', 'reporte-avance-agregado', id],
    queryFn: async () => {
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}/agregado`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar agregado')
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  // Seed inicial cuando ambos cargan
  useEffect(() => {
    if (seeded || !detalleQuery.data || !agregadoQuery.data) return
    const d = detalleQuery.data
    const a = agregadoQuery.data
    setNumero(d.numero != null ? String(d.numero) : '')
    setAlcanceTexto(d.alcanceTexto ?? '')
    setResumenEjecutivo(d.resumenEjecutivo ?? '')
    setComentariosHitos(parseComentarios(d.comentariosHitos))
    setVariacionesCausa(parseVariaciones(d.variaciones))
    setImpedimentos(
      a.impedimentos.map((i) => ({
        restriccion: i.restriccion,
        responsable: i.responsable ?? '',
        fechaLimite: i.fechaLimite ?? '',
      })),
    )
    setSeeded(true)
  }, [seeded, detalleQuery.data, agregadoQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const numeroVal = numero.trim() === '' ? null : Number(numero)
      const body = {
        numero: numeroVal != null && Number.isFinite(numeroVal) ? Math.trunc(numeroVal) : null,
        alcanceTexto: alcanceTexto.trim() === '' ? null : alcanceTexto,
        resumenEjecutivo: resumenEjecutivo.trim() === '' ? null : resumenEjecutivo,
        comentariosHitos: Object.entries(comentariosHitos)
          .filter(([, c]) => c.trim() !== '')
          .map(([hitoId, comentario]) => ({ hitoId, comentario: comentario.trim() })),
        variaciones: Object.entries(variacionesCausa)
          .filter(([, c]) => c.trim() !== '')
          .map(([fase, causa]) => ({ fase, causa: causa.trim() })),
        impedimentos: impedimentos
          .filter((i) => i.restriccion.trim() !== '')
          .map((i) => ({
            restriccion: i.restriccion.trim(),
            responsable: i.responsable.trim() === '' ? null : i.responsable.trim(),
            fechaLimite: i.fechaLimite.trim() === '' ? null : i.fechaLimite.trim(),
          })),
      }
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error al guardar')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Reporte guardado')
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'reporte-avance', id] })
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'reporte-avance-agregado', id] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al guardar'),
  })

  const invalidarTodo = () => {
    queryClient.invalidateQueries({ queryKey: ['proyectos', 'reporte-avance', id] })
    queryClient.invalidateQueries({ queryKey: ['proyectos', 'reportes-avance'] })
  }

  const enviarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}/enviar`, { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error')
    },
    onSuccess: () => { toast.success('Reporte enviado a revisión'); invalidarTodo() },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })
  const aprobarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}/aprobar`, { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error')
    },
    onSuccess: () => { toast.success('Reporte aprobado'); invalidarTodo() },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })
  const rechazarMutation = useMutation({
    mutationFn: async (notas: string) => {
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notasRevision: notas }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error')
    },
    onSuccess: () => { toast.success('Reporte rechazado'); invalidarTodo() },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  // Snapshot semanal de avance (Curva S de avance)
  const snapshotQuery = useQuery<{ existe: boolean; progresoGeneral: number | null; tareasCapturadas: number }>({
    queryKey: ['proyectos', 'reporte-avance-snapshot', id],
    queryFn: async () => {
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}/snapshot`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
    enabled: puedeSnapshot,
  })
  const snapshotMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proyectos/reportes-semanales/${id}/snapshot`, { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Error al tomar snapshot')
      return data as { tareasCapturadas: number; progresoGeneral: number }
    },
    onSuccess: (data) => {
      toast.success(`Snapshot tomado: ${data.tareasCapturadas} tareas · ${data.progresoGeneral.toFixed(1)}% global`)
      queryClient.invalidateQueries({ queryKey: ['proyectos', 'reporte-avance-snapshot', id] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al tomar snapshot'),
  })

  const descargarExcel = async (preview = false) => {
    if (preview) setPrevisualizando(true)
    else setDescargando(true)
    try {
      const url = `/api/proyectos/reportes-semanales/${id}/exportar-excel${preview ? '?preview=true' : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error al generar Excel')
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const filename = cd.match(/filename="?([^"]+)"?/)?.[1] ?? `Reporte_${id}.xlsx`
      const objectUrl = URL.createObjectURL(blob)
      if (preview) {
        const popup = window.open(objectUrl, '_blank')
        if (!popup) toast.warning('Permite popups para previsualizar')
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      } else {
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(objectUrl)
        toast.success('Excel generado')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar Excel')
    } finally {
      if (preview) setPrevisualizando(false)
      else setDescargando(false)
    }
  }

  if (detalleQuery.isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-3 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (detalleQuery.isError || !detalleQuery.data) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
        <Link href="/proyectos/reportes-semanales">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        </Link>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar el reporte.
        </div>
      </div>
    )
  }

  const d = detalleQuery.data
  const agg = agregadoQuery.data
  const estado = d.estado
  const isEditable = estado === 'borrador' || estado === 'rechazado' || isBypass
  const puedeEnviar = estado === 'borrador' || estado === 'rechazado'
  const semanaLabel = (() => {
    const m = d.semanaIso.match(/^(\d{4})-W(\d{2})$/)
    return m ? `Semana ${m[2]} de ${m[1]}` : d.semanaIso
  })()

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-2 flex-wrap">
        <Link href="/proyectos/reportes-semanales">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight">{d.proyecto.nombre}</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {d.proyecto.codigo} · {semanaLabel}
            {d.numero != null && ` · N° ${String(d.numero).padStart(4, '0')}`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Corte {fechaCorta(d.fechaCorte)} · {fechaCorta(d.fechaInicio)}–{fechaCorta(d.fechaFin)}
          </p>
        </div>
        <Badge className={cn('text-[10px] border', ESTADO_COLOR[estado])}>{ESTADO_REPORTE_AVANCE_LABELS[estado]}</Badge>
      </div>

      {/* Acciones de estado + exportar */}
      <div className="flex gap-2 flex-wrap">
        {isEditable && (
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Guardando…</>
              : <><Save className="h-3.5 w-3.5 mr-1" /> Guardar</>}
          </Button>
        )}
        {puedeEnviar && (
          <Button size="sm" variant="outline" onClick={() => setConfirmEnviar(true)} disabled={enviarMutation.isPending}>
            <Send className="h-3.5 w-3.5 mr-1" /> Enviar a revisión
          </Button>
        )}
        {estado === 'enviado' && isRevision && (
          <>
            <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => setConfirmAprobar(true)} disabled={aprobarMutation.isPending}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprobar
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setConfirmRechazar(true)} disabled={rechazarMutation.isPending}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
            </Button>
          </>
        )}
        {puedeSnapshot && (
          <Button size="sm" variant="outline" onClick={() => snapshotMutation.mutate()} disabled={snapshotMutation.isPending}>
            {snapshotMutation.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Capturando…</>
              : <><Camera className="h-3.5 w-3.5 mr-1" /> {snapshotQuery.data?.existe ? 'Actualizar snapshot' : 'Tomar snapshot de avance'}</>}
          </Button>
        )}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => descargarExcel(true)} disabled={previsualizando || descargando}>
          {previsualizando
            ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generando…</>
            : <><Eye className="h-3.5 w-3.5 mr-1" /> Vista previa</>}
        </Button>
        <Button size="sm" variant="outline" onClick={() => descargarExcel(false)} disabled={descargando || previsualizando}>
          {descargando
            ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generando…</>
            : <><Download className="h-3.5 w-3.5 mr-1" /> Descargar Excel</>}
        </Button>
      </div>

      {/* Aviso de rechazo */}
      {estado === 'rechazado' && d.notasRevision && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-1">
          <p className="text-xs font-semibold text-red-700">Motivo del rechazo</p>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{d.notasRevision}</p>
        </div>
      )}

      {/* Narrativa */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Datos del reporte</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Número</Label>
              {isEditable ? (
                <Input type="number" min={0} value={numero} onChange={(e) => setNumero(e.target.value)} className="h-8" />
              ) : (
                <p className="text-sm">{d.numero ?? '—'}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alcance</Label>
            {isEditable ? (
              <Textarea value={alcanceTexto} onChange={(e) => setAlcanceTexto(e.target.value)} rows={3}
                placeholder="Alcance del proyecto / semana…" />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{d.alcanceTexto || <span className="text-muted-foreground italic">—</span>}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Resumen ejecutivo</Label>
            {isEditable ? (
              <Textarea value={resumenEjecutivo} onChange={(e) => setResumenEjecutivo(e.target.value)} rows={4}
                placeholder="Resumen de avance, logros y observaciones…" />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{d.resumenEjecutivo || <span className="text-muted-foreground italic">—</span>}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hitos: comentarios override */}
      {agg && agg.hitos.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Hitos ({agg.hitos.length})</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {agg.hitos.map((h) => (
              <div key={h.id} className="border rounded-md p-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-[10px] border bg-gray-100 text-gray-700 border-gray-200 capitalize">{h.tipo}</Badge>
                  <span className="text-sm font-medium">{h.nombre}</span>
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground flex-wrap">
                  <span>Plan: {fechaCorta(h.fechaPlan)}</span>
                  <span>Pronóstico: {fechaCorta(h.fechaPronostico)}</span>
                  <span>Real: {fechaCorta(h.fechaReal)}</span>
                </div>
                {isEditable ? (
                  <Input
                    className="h-8 text-sm"
                    placeholder="Comentario del hito…"
                    value={comentariosHitos[h.id] ?? ''}
                    onChange={(e) => setComentariosHitos((prev) => ({ ...prev, [h.id]: e.target.value }))}
                  />
                ) : (
                  (comentariosHitos[h.id] || h.comentario) && (
                    <p className="text-xs text-muted-foreground">{comentariosHitos[h.id] || h.comentario}</p>
                  )
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Variaciones por fase */}
      {agg && agg.avancePorFase.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Variaciones por fase</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {agg.avancePorFase.map((f) => (
              <div key={f.faseId} className="grid grid-cols-[1fr_2fr] gap-2 items-center">
                <span className="text-sm">{f.nombre}</span>
                {isEditable ? (
                  <Input
                    className="h-8 text-sm"
                    placeholder="Causa de variación…"
                    value={variacionesCausa[f.nombre] ?? ''}
                    onChange={(e) => setVariacionesCausa((prev) => ({ ...prev, [f.nombre]: e.target.value }))}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">{variacionesCausa[f.nombre] || '—'}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Impedimentos */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Impedimentos / restricciones</CardTitle>
          {isEditable && (
            <Button size="sm" variant="ghost" className="h-7"
              onClick={() => setImpedimentos((p) => [...p, { restriccion: '', responsable: '', fechaLimite: '' }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Añadir
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {impedimentos.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Sin impedimentos.</p>
          )}
          {impedimentos.map((imp, i) => (
            <div key={i} className="border rounded-md p-2 space-y-1.5">
              {isEditable ? (
                <>
                  <Textarea
                    className="text-sm"
                    rows={2}
                    placeholder="Restricción / impedimento"
                    value={imp.restriccion}
                    onChange={(e) => setImpedimentos((p) => p.map((x, j) => (j === i ? { ...x, restriccion: e.target.value } : x)))}
                  />
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <Input
                      className="h-8 text-sm"
                      placeholder="Responsable"
                      value={imp.responsable}
                      onChange={(e) => setImpedimentos((p) => p.map((x, j) => (j === i ? { ...x, responsable: e.target.value } : x)))}
                    />
                    <Input
                      type="date"
                      className="h-8 text-sm w-40"
                      value={imp.fechaLimite}
                      onChange={(e) => setImpedimentos((p) => p.map((x, j) => (j === i ? { ...x, fechaLimite: e.target.value } : x)))}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => setImpedimentos((p) => p.filter((_, j) => j !== i))} aria-label="Quitar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm">
                  <p>{imp.restriccion}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {imp.responsable && `Resp.: ${imp.responsable}`}
                    {imp.fechaLimite && ` · Límite: ${fechaCorta(imp.fechaLimite)}`}
                  </p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview de datos automáticos (solo lectura) */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Datos automáticos (saldrán en el Excel)</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Avance por fase */}
          <div>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> Avance por fase</p>
            {agg && agg.avancePorFase.length > 0 ? (
              <div className="space-y-1">
                {agg.avancePorFase.map((f) => (
                  <div key={f.faseId} className="flex items-center justify-between text-xs">
                    <span>{f.nombre}</span>
                    <span className="font-mono font-semibold">{f.porcentajeAvance}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin fases en el cronograma de ejecución.</p>
            )}
          </div>

          {/* Fotos */}
          <div>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" /> Fotos del reporte ({agg?.fotos.length ?? 0})
            </p>
            {agg && agg.fotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {agg.fotos.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/proyectos/registros-evidencia/fotos/${f.id}/contenido`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block space-y-1"
                    title={f.leyenda ?? f.registroDescripcion}
                  >
                    <div className="aspect-square rounded-md overflow-hidden border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/proyectos/registros-evidencia/fotos/${f.id}/contenido`}
                        alt={f.leyenda ?? f.registroDescripcion}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {f.leyenda ?? f.registroDescripcion}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No hay fotos marcadas para reporte en esta semana.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Curva S de Avance */}
      {detalleQuery.data?.proyecto.id && (
        <CurvaSAvanceChart proyectoId={detalleQuery.data.proyecto.id} />
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Autor</dt>
            <dd>{d.autor.name ?? '—'}</dd>
            {d.aprobador && (<><dt className="text-muted-foreground">Revisado por</dt><dd>{d.aprobador.name ?? '—'}</dd></>)}
            {d.enviadoAt && (<><dt className="text-muted-foreground">Enviado</dt><dd>{fechaCorta(d.enviadoAt)}</dd></>)}
            {d.aprobadoAt && (<><dt className="text-muted-foreground">Aprobado</dt><dd>{fechaCorta(d.aprobadoAt)}</dd></>)}
          </dl>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AlertDialog open={confirmEnviar} onOpenChange={setConfirmEnviar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar reporte a revisión?</AlertDialogTitle>
            <AlertDialogDescription>Una vez enviado, no podrá editarse hasta que sea rechazado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmEnviar(false); enviarMutation.mutate() }} disabled={enviarMutation.isPending}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAprobar} onOpenChange={setConfirmAprobar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar este reporte?</AlertDialogTitle>
            <AlertDialogDescription>Quedará aprobado y ya no podrá modificarse (salvo admin/gerente/gestor).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { setConfirmAprobar(false); aprobarMutation.mutate() }} disabled={aprobarMutation.isPending}>
              Aprobar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRechazar} onOpenChange={setConfirmRechazar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar reporte</AlertDialogTitle>
            <AlertDialogDescription>El reporte volverá a borrador para que el autor lo corrija.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label className="text-sm mb-1 block">Motivo del rechazo *</Label>
            <Textarea value={notasRechazo} onChange={(e) => setNotasRechazo(e.target.value)} placeholder="Indica qué debe corregirse…" rows={3} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotasRechazo('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={notasRechazo.trim().length < 5 || rechazarMutation.isPending}
              onClick={() => { setConfirmRechazar(false); rechazarMutation.mutate(notasRechazo); setNotasRechazo('') }}
            >
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
