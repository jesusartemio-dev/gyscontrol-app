'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  Archive,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GaleriaFotos } from './GaleriaFotos'
import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'
import type { RegistroSeguridadInforme } from '@/lib/services/informeMensualSeguridad'
import { cn } from '@/lib/utils'

// ─── Color config per tipo ────────────────────────────────────────────────────
type ColorAccent = 'blue' | 'green' | 'gray' | 'red' | 'orange' | 'emerald' | 'purple' | 'slate'

const ACCENT_BADGE: Record<ColorAccent, string> = {
  blue:    'bg-blue-100 text-blue-700 border-blue-200',
  green:   'bg-green-100 text-green-700 border-green-200',
  gray:    'bg-gray-100 text-gray-700 border-gray-200',
  red:     'bg-red-100 text-red-700 border-red-200',
  orange:  'bg-orange-100 text-orange-700 border-orange-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  purple:  'bg-purple-100 text-purple-700 border-purple-200',
  slate:   'bg-slate-100 text-slate-700 border-slate-200',
}

const ACCENT_BORDER_L: Record<ColorAccent, string> = {
  blue:    'border-l-blue-500',
  green:   'border-l-green-500',
  gray:    'border-l-gray-400',
  red:     'border-l-red-500',
  orange:  'border-l-orange-500',
  emerald: 'border-l-emerald-600',
  purple:  'border-l-purple-500',
  slate:   'border-l-slate-500',
}

// ─── "Copiar resumen" text generator ─────────────────────────────────────────

function pad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length)
}

function generarTextoResumen(
  tipo: TipoRegistroSeguridad,
  registros: RegistroSeguridadInforme[],
): string {
  if (registros.length === 0) return `Sin registros de tipo "${TIPO_REGISTRO_LABELS[tipo]}".`

  const formatFecha = (d: Date | string) =>
    format(new Date(d), 'dd-MMM-yy', { locale: es })

  if (tipo === 'charla') {
    const totalAsistentes = registros.reduce((s, r) => s + (r.asistentes ?? 0), 0)
    const header = `Durante el mes se realizaron ${registros.length} charla${registros.length !== 1 ? 's' : ''} de seguridad con un total de ${totalAsistentes} asistente${totalAsistentes !== 1 ? 's' : ''}-evento.\n`
    const sep = `\n${'─'.repeat(72)}\n`
    const cols = `${pad('Fecha', 12)}${pad('Tema', 46)}Asistentes`
    const rows = registros
      .map((r) => {
        const f = formatFecha(new Date(r.evidencia.jornada.fechaTrabajo))
        return `${pad(f, 12)}${pad(r.descripcion, 46)}${r.asistentes ?? 0}`
      })
      .join('\n')
    return `${header}${sep}${cols}\n${'─'.repeat(72)}\n${rows}`
  }

  const header = `Durante el mes se registraron ${registros.length} ${TIPO_REGISTRO_LABELS[tipo].toLowerCase()}${registros.length !== 1 ? 's' : ''}.\n`
  const sep = `\n${'─'.repeat(72)}\n`
  const cols = `${pad('Fecha', 12)}Descripción`
  const rows = registros
    .map((r) => {
      const f = formatFecha(new Date(r.evidencia.jornada.fechaTrabajo))
      const desc = r.descripcion.length > 56 ? r.descripcion.slice(0, 55) + '…' : r.descripcion
      return `${pad(f, 12)}${desc}`
    })
    .join('\n')
  return `${header}${sep}${cols}\n${'─'.repeat(72)}\n${rows}`
}

// ─── Individual registro card ────────────────────────────────────────────────

function RegistroCard({
  registro,
  accent,
  zipUrl,
}: {
  registro: RegistroSeguridadInforme
  accent: ColorAccent
  zipUrl?: string
}) {
  const [expandido, setExpandido] = useState(false)

  const fechaTrabajo = new Date(registro.evidencia.jornada.fechaTrabajo)
  const fechaLabel = format(fechaTrabajo, "d 'de' MMMM yyyy", { locale: es })
  const hace = formatDistanceToNow(new Date(registro.createdAt), { locale: es, addSuffix: true })
  const descripcionLarga = registro.descripcion.length > 200

  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 bg-card p-4 space-y-3',
        ACCENT_BORDER_L[accent],
      )}
    >
      {/* Top row: fecha + badges */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            {fechaLabel}
          </span>
          <span className="text-xs text-muted-foreground/60">· reg. {hace}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {registro.tipo === 'charla' && registro.asistentes != null && (
            <Badge className={cn('text-[10px] border', ACCENT_BADGE[accent])}>
              <Users className="h-2.5 w-2.5 mr-1" />
              {registro.asistentes} asistentes
            </Badge>
          )}
          {registro.fotos.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <ImageIcon className="h-2.5 w-2.5 mr-1" />
              {registro.fotos.length} foto{registro.fotos.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Descripción */}
      <div className="text-sm leading-relaxed">
        {descripcionLarga && !expandido ? (
          <>
            <span>{registro.descripcion.slice(0, 200)}…</span>
            <button
              type="button"
              onClick={() => setExpandido(true)}
              className="ml-1 text-xs text-primary underline-offset-2 hover:underline"
            >
              ver más
            </button>
          </>
        ) : (
          <>
            {registro.descripcion}
            {descripcionLarga && (
              <button
                type="button"
                onClick={() => setExpandido(false)}
                className="ml-1 text-xs text-primary underline-offset-2 hover:underline"
              >
                ver menos
              </button>
            )}
          </>
        )}
      </div>

      {/* Meta: supervisor + ingeniero */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {registro.evidencia.jornada.supervisor && (
          <span>
            Supervisor: {registro.evidencia.jornada.supervisor.name ?? '—'}
          </span>
        )}
        <span>Ingeniero: {registro.ingeniero.name ?? registro.ingeniero.email}</span>
        <span className="text-[11px] font-mono text-muted-foreground/60">
          {registro.evidencia.jornada.proyecto.codigo}
        </span>
      </div>

      {/* Observaciones */}
      {registro.observaciones && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
          {registro.observaciones}
        </p>
      )}

      {/* Galería de fotos */}
      {registro.fotos.length > 0 && (
        <GaleriaFotos fotos={registro.fotos} zipUrl={zipUrl} />
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  tipo: TipoRegistroSeguridad
  registros: RegistroSeguridadInforme[]
  titulo: string
  descripcion?: string
  colorAccent?: ColorAccent
  proyectoId: string
  mes: string
  diasSinAccidentes?: number
}

export function PestañaRegistros({
  tipo,
  registros,
  titulo,
  descripcion,
  colorAccent = 'slate',
  proyectoId,
  mes,
  diasSinAccidentes,
}: Props) {
  const [zipLoading, setZipLoading] = useState(false)

  const totalFotos = registros.reduce((s, r) => s + r.fotos.length, 0)
  const zipUrl = `/api/seguridad/informe-mensual/${proyectoId}/fotos-zip?mes=${mes}&tipo=${tipo}`

  const copiarResumen = async () => {
    const texto = generarTextoResumen(tipo, registros)
    await navigator.clipboard.writeText(texto)
    toast.success('Resumen copiado al portapapeles')
  }

  const descargarZip = async () => {
    if (totalFotos === 0) {
      toast.info('No hay fotos para descargar en este tipo')
      return
    }
    setZipLoading(true)
    try {
      const res = await fetch(zipUrl, { credentials: 'include' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error al generar ZIP')
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `fotos_${tipo}_${mes}.zip`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`ZIP descargado: ${filename}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar ZIP')
    } finally {
      setZipLoading(false)
    }
  }

  // ── Empty state for incidentes ────────────────────────────────────────────
  if (tipo === 'incidente' && registros.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-3">
          <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
          <p className="text-base font-semibold text-emerald-800">
            Sin incidentes registrados en este mes
          </p>
          {diasSinAccidentes !== undefined && (
            <div className="space-y-0.5">
              <p className="text-5xl font-bold tabular-nums text-emerald-700">
                {diasSinAccidentes}
              </p>
              <p className="text-sm text-emerald-600">días sin accidentes</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Generic empty state ───────────────────────────────────────────────────
  if (registros.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Aún no se han registrado {TIPO_REGISTRO_LABELS[tipo].toLowerCase()}s en este mes.
        </p>
        <p className="text-xs text-muted-foreground/60">
          El ingeniero SSOMA puede registrarlas desde{' '}
          <span className="font-mono">/seguridad/registros/nuevo</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold">{titulo}</h3>
          {descripcion && (
            <p className="text-xs text-muted-foreground mt-0.5">{descripcion}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{registros.length}</span>{' '}
            registro{registros.length !== 1 ? 's' : ''}{' '}
            {totalFotos > 0 && (
              <>
                ·{' '}
                <span className="font-medium text-foreground">{totalFotos}</span>{' '}
                foto{totalFotos !== 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copiarResumen}>
            <Clipboard className="h-3.5 w-3.5 mr-1.5" />
            Copiar resumen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={descargarZip}
            disabled={zipLoading || totalFotos === 0}
            title={totalFotos === 0 ? 'Sin fotos para descargar' : undefined}
          >
            {zipLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Archive className="h-3.5 w-3.5 mr-1.5" />
            )}
            {zipLoading ? 'Generando ZIP…' : `Fotos ZIP${totalFotos > 0 ? ` (${totalFotos})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Incidentes with active days counter even when there are records */}
      {tipo === 'incidente' && diasSinAccidentes !== undefined && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-red-700">{diasSinAccidentes}</p>
            <p className="text-xs text-red-600">días sin accidentes</p>
          </div>
          <p className="text-sm text-red-700">
            Se registraron {registros.length} incidente{registros.length !== 1 ? 's' : ''} en el historial del proyecto.
          </p>
        </div>
      )}

      {/* Registro cards */}
      <div className="space-y-3">
        {registros.map((registro) => (
          <RegistroCard
            key={registro.id}
            registro={registro}
            accent={colorAccent}
            zipUrl={totalFotos > 0 ? zipUrl : undefined}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Per-tipo named exports for page.tsx ─────────────────────────────────────

import type { InformeMensualAgregado } from '@/lib/services/informeMensualSeguridad'

interface TabProps {
  data: InformeMensualAgregado
}

export function PestañaCharlas({ data }: TabProps) {
  return (
    <PestañaRegistros
      tipo="charla"
      registros={data.registrosPorTipo.charla}
      titulo={TIPO_REGISTRO_LABELS.charla}
      colorAccent="blue"
      proyectoId={data.proyecto.id}
      mes={data.periodo.mes}
    />
  )
}

export function PestañaInspecciones({ data }: TabProps) {
  return (
    <PestañaRegistros
      tipo="inspeccion"
      registros={data.registrosPorTipo.inspeccion}
      titulo={TIPO_REGISTRO_LABELS.inspeccion}
      colorAccent="green"
      proyectoId={data.proyecto.id}
      mes={data.periodo.mes}
    />
  )
}

export function PestañaObservaciones({ data }: TabProps) {
  return (
    <PestañaRegistros
      tipo="observacion"
      registros={data.registrosPorTipo.observacion}
      titulo={TIPO_REGISTRO_LABELS.observacion}
      colorAccent="gray"
      proyectoId={data.proyecto.id}
      mes={data.periodo.mes}
    />
  )
}

export function PestañaIncidentes({ data }: TabProps) {
  return (
    <PestañaRegistros
      tipo="incidente"
      registros={data.registrosPorTipo.incidente}
      titulo={TIPO_REGISTRO_LABELS.incidente}
      colorAccent="red"
      proyectoId={data.proyecto.id}
      mes={data.periodo.mes}
      diasSinAccidentes={data.kpis.diasSinAccidentes}
    />
  )
}

export function PestañaRiesgosCriticos({ data }: TabProps) {
  return (
    <PestañaRegistros
      tipo="riesgo_critico"
      registros={data.registrosPorTipo.riesgo_critico}
      titulo={TIPO_REGISTRO_LABELS.riesgo_critico}
      colorAccent="orange"
      proyectoId={data.proyecto.id}
      mes={data.periodo.mes}
    />
  )
}

export function PestañaMedioAmbiente({ data }: TabProps) {
  return (
    <PestañaRegistros
      tipo="medio_ambiente"
      registros={data.registrosPorTipo.medio_ambiente}
      titulo={TIPO_REGISTRO_LABELS.medio_ambiente}
      colorAccent="emerald"
      proyectoId={data.proyecto.id}
      mes={data.periodo.mes}
    />
  )
}

export function PestañaPrevencionSalud({ data }: TabProps) {
  return (
    <PestañaRegistros
      tipo="prevencion_salud"
      registros={data.registrosPorTipo.prevencion_salud}
      titulo={TIPO_REGISTRO_LABELS.prevencion_salud}
      colorAccent="purple"
      proyectoId={data.proyecto.id}
      mes={data.periodo.mes}
    />
  )
}

export function PestañaActividadGeneral({ data }: TabProps) {
  return (
    <PestañaRegistros
      tipo="actividad_general"
      registros={data.registrosPorTipo.actividad_general}
      titulo={TIPO_REGISTRO_LABELS.actividad_general}
      colorAccent="slate"
      proyectoId={data.proyecto.id}
      mes={data.periodo.mes}
    />
  )
}
