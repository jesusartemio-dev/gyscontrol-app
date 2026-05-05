'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle,
  Download,
  Eye,
  Loader2,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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

import { KpiEditable } from '@/components/seguridad/reportes-semanales/KpiEditable'
import { SeccionCategoria } from '@/components/seguridad/reportes-semanales/SeccionCategoria'
import {
  ESTADO_REPORTE_LABELS,
  type EstadoReporteSeguridad,
} from '@/lib/validators/reporteSeguridad'
import type { ReporteAgregado } from '@/lib/services/reporteSeguridad'
import type { TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'
import { cn } from '@/lib/utils'

const ESTADO_COLOR: Record<EstadoReporteSeguridad, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviado: 'bg-blue-100 text-blue-700 border-blue-200',
  aprobado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rechazado: 'bg-red-100 text-red-700 border-red-200',
}

const TIPOS_ORDENADOS: TipoRegistroSeguridad[] = [
  'charla',
  'inspeccion',
  'observacion',
  'incidente',
  'riesgo_critico',
  'actividad_general',
  'medio_ambiente',
  'prevencion_salud',
]

export default function EditorReporteSeguridadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmEnviar, setConfirmEnviar] = useState(false)
  const [confirmAprobar, setConfirmAprobar] = useState(false)
  const [confirmRechazar, setConfirmRechazar] = useState(false)
  const [notasRechazo, setNotasRechazo] = useState('')
  const [savingDebounce, setSavingDebounce] = useState(false)
  const [pptDownloading, setPptDownloading] = useState(false)
  const [pptPreviewing, setPptPreviewing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const descargarPpt = async (preview = false) => {
    if (preview) setPptPreviewing(true)
    else setPptDownloading(true)
    try {
      const url = preview
        ? `/api/seguridad/reportes-semanales/${id}/exportar-pptx?preview=true`
        : `/api/seguridad/reportes-semanales/${id}/exportar-pptx`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al generar PPT')
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `Reporte_${id}.pptx`
      const objectUrl = URL.createObjectURL(blob)
      if (preview) {
        const popup = window.open(objectUrl, '_blank')
        if (!popup) {
          toast.warning('Permite popups para previsualizar el PPT')
        } else {
          toast.info('PowerPoint no se renderiza en el browser. El archivo se abrirá o descargará según tu sistema.')
        }
        // Limpieza diferida — el browser puede tardar en abrirlo
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      } else {
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(objectUrl)
        toast.success('PPT generado correctamente')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar PPT')
    } finally {
      if (preview) setPptPreviewing(false)
      else setPptDownloading(false)
    }
  }

  // Local draft of editable KPI fields
  const [draft, setDraft] = useState<{
    resumenEjecutivo: string
    horasHombre: number | null
    diasSinAccidentes: number | null
    incidentesCount: number | null
    accidentesCount: number | null
    horasCapacitacion: number | null
    personasCapacitadas: number | null
    // COVID
    totalPersonas: number | null
    trabajadoresObra: number | null
    homeOffice: number | null
    casosSospechosos: number | null
    casosInfectados: number | null
    casosCurados: number | null
    fallecidos: number | null
    grupoRiesgo: number | null
  } | null>(null)

  const query = useQuery<ReporteAgregado>({
    queryKey: ['seguridad', 'reporte-agregado', id],
    queryFn: async () => {
      const res = await fetch(`/api/seguridad/reportes-semanales/${id}/agregado`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  // Initialize draft when data first loads
  useEffect(() => {
    if (query.data && draft === null) {
      const r = query.data.reporte
      setDraft({
        resumenEjecutivo: r.resumenEjecutivo ?? '',
        horasHombre: r.horasHombre ?? null,
        diasSinAccidentes: r.diasSinAccidentes ?? null,
        incidentesCount: r.incidentesCount ?? null,
        accidentesCount: r.accidentesCount ?? null,
        horasCapacitacion: r.horasCapacitacion ?? null,
        personasCapacitadas: r.personasCapacitadas ?? null,
        totalPersonas: r.totalPersonas ?? null,
        trabajadoresObra: r.trabajadoresObra ?? null,
        homeOffice: r.homeOffice ?? null,
        casosSospechosos: r.casosSospechosos ?? null,
        casosInfectados: r.casosInfectados ?? null,
        casosCurados: r.casosCurados ?? null,
        fallecidos: r.fallecidos ?? null,
        grupoRiesgo: r.grupoRiesgo ?? null,
      })
    }
  }, [query.data, draft])

  const saveMutation = useMutation({
    mutationFn: async (data: typeof draft) => {
      const res = await fetch(`/api/seguridad/reportes-semanales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error al guardar')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'reporte-agregado', id] })
      setSavingDebounce(false)
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
      setSavingDebounce(false)
    },
  })

  // Debounced auto-save
  const scheduleAutoSave = useCallback(
    (newDraft: typeof draft) => {
      setSavingDebounce(true)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        saveMutation.mutate(newDraft)
      }, 1500)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  )

  const updateDraft = (patch: Partial<NonNullable<typeof draft>>) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      scheduleAutoSave(next)
      return next
    })
  }

  const enviarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/seguridad/reportes-semanales/${id}/enviar`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Reporte enviado a revisión')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'reporte-agregado', id] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  const aprobarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/seguridad/reportes-semanales/${id}/aprobar`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Reporte aprobado')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'reporte-agregado', id] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  const rechazarMutation = useMutation({
    mutationFn: async (notas: string) => {
      const res = await fetch(`/api/seguridad/reportes-semanales/${id}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notasRevision: notas }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Reporte rechazado')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'reporte-agregado', id] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/seguridad/reportes-semanales/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error')
      }
    },
    onSuccess: () => {
      toast.success('Reporte eliminado')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'reportes-semanales'] })
      router.push('/seguridad/reportes-semanales')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  if (query.isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-3 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
        <Link href="/seguridad/reportes-semanales">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        </Link>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar el reporte.
        </div>
      </div>
    )
  }

  const { reporte, kpiCalculado, registros } = query.data
  const estado = reporte.estado
  const isEditable = estado === 'borrador' || estado === 'rechazado'
  const isSaving = savingDebounce || saveMutation.isPending

  const registrosPorTipo = TIPOS_ORDENADOS.reduce(
    (acc, tipo) => {
      const items = registros.filter((r) => r.tipo === tipo)
      if (items.length > 0) acc[tipo] = items
      return acc
    },
    {} as Record<TipoRegistroSeguridad, typeof registros>,
  )

  const semanaLabel = (() => {
    const m = reporte.semanaIso.match(/^(\d{4})-W(\d{2})$/)
    return m ? `Semana ${m[2]} de ${m[1]}` : reporte.semanaIso
  })()

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-2 flex-wrap">
        <Link href="/seguridad/reportes-semanales">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight">{reporte.proyecto.nombre}</h1>
          <p className="text-xs text-muted-foreground font-mono">{reporte.proyecto.codigo} · {semanaLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn('text-[10px] border', ESTADO_COLOR[estado])}>
            {ESTADO_REPORTE_LABELS[estado]}
          </Badge>
          {isSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
            </span>
          )}
        </div>
      </div>

      {/* Acciones de flujo */}
      <div className="flex gap-2 flex-wrap">
        {isEditable && (
          <Button
            size="sm"
            onClick={() => setConfirmEnviar(true)}
            disabled={enviarMutation.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Enviar a revisión
          </Button>
        )}
        {estado === 'enviado' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => setConfirmAprobar(true)}
              disabled={aprobarMutation.isPending}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setConfirmRechazar(true)}
              disabled={rechazarMutation.isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => descargarPpt(true)}
          disabled={pptPreviewing || pptDownloading}
          title="Abre el PPT en una pestaña (PowerPoint lo descargará si no se renderiza)"
        >
          {pptPreviewing ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generando…</>
          ) : (
            <><Eye className="h-3.5 w-3.5 mr-1" /> Vista previa</>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => descargarPpt(false)}
          disabled={pptDownloading || pptPreviewing}
          title="Descarga el PPT para enviarlo al cliente"
        >
          {pptDownloading ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generando…</>
          ) : (
            <><Download className="h-3.5 w-3.5 mr-1" /> Generar PPT</>
          )}
        </Button>
        {estado !== 'aprobado' && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
          </Button>
        )}
      </div>

      {/* Notas de rechazo */}
      {estado === 'rechazado' && reporte.notasRevision && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-1">
          <p className="text-xs font-semibold text-red-700">Motivo del rechazo</p>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{reporte.notasRevision}</p>
        </div>
      )}

      {/* KPIs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Indicadores de la semana</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <KpiEditable
              label="Jornadas"
              calculado={kpiCalculado.jornadasCount}
              override={null}
              onChange={() => {}}
              disabled
            />
            <KpiEditable
              label="Personas en campo"
              calculado={kpiCalculado.personasEnCampo}
              override={null}
              onChange={() => {}}
              disabled
            />
            <KpiEditable
              label="Registros"
              calculado={kpiCalculado.registrosTotales}
              override={null}
              onChange={() => {}}
              disabled
            />
            <KpiEditable
              label="HH trabajadas"
              calculado={null}
              override={draft?.horasHombre ?? null}
              onChange={(v) => updateDraft({ horasHombre: v })}
              disabled={!isEditable}
              decimals
              unit="h"
            />
            <KpiEditable
              label="Días sin accidentes"
              calculado={null}
              override={draft?.diasSinAccidentes ?? null}
              onChange={(v) => updateDraft({ diasSinAccidentes: v })}
              disabled={!isEditable}
            />
            <KpiEditable
              label="Incidentes"
              calculado={kpiCalculado.incidenteCount}
              override={draft?.incidentesCount ?? null}
              onChange={(v) => updateDraft({ incidentesCount: v })}
              disabled={!isEditable}
            />
            <KpiEditable
              label="Accidentes"
              calculado={kpiCalculado.accidenteCount}
              override={draft?.accidentesCount ?? null}
              onChange={(v) => updateDraft({ accidentesCount: v })}
              disabled={!isEditable}
            />
            <KpiEditable
              label="H. capacitación"
              calculado={null}
              override={draft?.horasCapacitacion ?? null}
              onChange={(v) => updateDraft({ horasCapacitacion: v })}
              disabled={!isEditable}
              decimals
              unit="h"
            />
            <KpiEditable
              label="Personas capacitadas"
              calculado={kpiCalculado.asistentesCharla}
              override={draft?.personasCapacitadas ?? null}
              onChange={(v) => updateDraft({ personasCapacitadas: v })}
              disabled={!isEditable}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reporte COVID 19 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reporte COVID 19</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <CovidInput label="Total personas" value={draft?.totalPersonas ?? null} onChange={(v) => updateDraft({ totalPersonas: v })} disabled={!isEditable} />
            <CovidInput label="Trabajan en obra" value={draft?.trabajadoresObra ?? null} onChange={(v) => updateDraft({ trabajadoresObra: v })} disabled={!isEditable} />
            <CovidInput label="Home office" value={draft?.homeOffice ?? null} onChange={(v) => updateDraft({ homeOffice: v })} disabled={!isEditable} />
            <CovidInput label="Sospechosos" value={draft?.casosSospechosos ?? null} onChange={(v) => updateDraft({ casosSospechosos: v })} disabled={!isEditable} />
            <CovidInput label="Infectados" value={draft?.casosInfectados ?? null} onChange={(v) => updateDraft({ casosInfectados: v })} disabled={!isEditable} />
            <CovidInput label="Curados" value={draft?.casosCurados ?? null} onChange={(v) => updateDraft({ casosCurados: v })} disabled={!isEditable} />
            <CovidInput label="Fallecidos" value={draft?.fallecidos ?? null} onChange={(v) => updateDraft({ fallecidos: v })} disabled={!isEditable} />
            <CovidInput label="Grupo riesgo" value={draft?.grupoRiesgo ?? null} onChange={(v) => updateDraft({ grupoRiesgo: v })} disabled={!isEditable} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Si tu cliente no requiere reporte COVID, deja todos los campos vacíos y el bloque se omitirá del PPT.
          </p>
        </CardContent>
      </Card>

      {/* Resumen ejecutivo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen ejecutivo</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isEditable ? (
            <Textarea
              placeholder="Describe los hitos, logros y observaciones destacadas de la semana…"
              value={draft?.resumenEjecutivo ?? ''}
              onChange={(e) => updateDraft({ resumenEjecutivo: e.target.value })}
              rows={5}
              className="resize-none"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {reporte.resumenEjecutivo || <span className="text-muted-foreground italic">Sin resumen ejecutivo</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actividades por categoría */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Actividades por categoría ({registros.length})</h2>
        {(isEditable ? TIPOS_ORDENADOS : TIPOS_ORDENADOS.filter((t) => registrosPorTipo[t])).map((tipo) => (
          <SeccionCategoria
            key={tipo}
            tipo={tipo}
            registros={registrosPorTipo[tipo] ?? []}
            agregarContext={
              isEditable
                ? { proyectoId: reporte.proyectoId, semanaIso: reporte.semanaIso, reporteId: reporte.id }
                : undefined
            }
          />
        ))}
        {registros.length === 0 && !isEditable && (
          <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
            No hay registros de campo para esta semana y proyecto.
          </div>
        )}
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Ingeniero</dt>
            <dd>{reporte.ingeniero.name ?? '—'}</dd>
            {reporte.aprobador && (
              <>
                <dt className="text-muted-foreground">Revisado por</dt>
                <dd>{reporte.aprobador.name ?? '—'}</dd>
              </>
            )}
            {reporte.enviadoAt && (
              <>
                <dt className="text-muted-foreground">Enviado</dt>
                <dd>{new Date(reporte.enviadoAt).toLocaleDateString('es-PE')}</dd>
              </>
            )}
            {reporte.aprobadoAt && (
              <>
                <dt className="text-muted-foreground">Aprobado</dt>
                <dd>{new Date(reporte.aprobadoAt).toLocaleDateString('es-PE')}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AlertDialog open={confirmEnviar} onOpenChange={setConfirmEnviar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar reporte a revisión?</AlertDialogTitle>
            <AlertDialogDescription>
              Una vez enviado, el reporte no podrá editarse hasta que sea rechazado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmEnviar(false); enviarMutation.mutate() }}
              disabled={enviarMutation.isPending}
            >
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAprobar} onOpenChange={setConfirmAprobar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar este reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              El reporte quedará aprobado y ya no podrá modificarse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { setConfirmAprobar(false); aprobarMutation.mutate() }}
              disabled={aprobarMutation.isPending}
            >
              Aprobar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRechazar} onOpenChange={setConfirmRechazar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar reporte</AlertDialogTitle>
            <AlertDialogDescription>
              El reporte volverá a borrador y el ingeniero podrá corregirlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label className="text-sm mb-1 block">Motivo del rechazo *</Label>
            <Textarea
              value={notasRechazo}
              onChange={(e) => setNotasRechazo(e.target.value)}
              placeholder="Indica qué debe corregirse…"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotasRechazo('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={notasRechazo.trim().length < 5 || rechazarMutation.isPending}
              onClick={() => {
                setConfirmRechazar(false)
                rechazarMutation.mutate(notasRechazo)
                setNotasRechazo('')
              }}
            >
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El reporte se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Eliminando…</> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Input numérico simple para COVID ────────────────────────────────────────
function CovidInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : '')

  // Mantén local sincronizado con prop cuando cambia desde fuera
  useEffect(() => {
    setDraft(value != null ? String(value) : '')
  }, [value])

  const commit = (s: string) => {
    if (s.trim() === '') {
      onChange(null)
      return
    }
    const n = parseInt(s, 10)
    if (!Number.isFinite(n) || n < 0) return
    onChange(n)
  }

  return (
    <div className="space-y-1">
      <label className="text-[11px] text-muted-foreground uppercase tracking-wide block">{label}</label>
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        className="w-full rounded border bg-white px-2 py-1.5 text-base font-bold disabled:opacity-60"
        placeholder="—"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        disabled={disabled}
      />
    </div>
  )
}
