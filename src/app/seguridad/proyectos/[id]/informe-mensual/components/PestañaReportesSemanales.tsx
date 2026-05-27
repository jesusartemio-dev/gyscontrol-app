'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquareWarning,
  Send,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ESTADO_REPORTE_LABELS,
  type EstadoReporteSeguridad,
} from '@/lib/validators/reporteSeguridad'
import type { InformeMensualAgregado, ReporteInforme } from '@/lib/services/informeMensualSeguridad'
import { cn } from '@/lib/utils'

const ESTADO_COLOR: Record<EstadoReporteSeguridad, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviado:  'bg-blue-100 text-blue-700 border-blue-200',
  aprobado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rechazado: 'bg-red-100 text-red-700 border-red-200',
}

const ESTADO_ICON: Record<EstadoReporteSeguridad, React.ReactNode> = {
  borrador:  <Clock className="h-3 w-3" />,
  enviado:   <Send className="h-3 w-3" />,
  aprobado:  <CheckCircle2 className="h-3 w-3" />,
  rechazado: <XCircle className="h-3 w-3" />,
}

function semanaLabel(semanaIso: string): string {
  const m = semanaIso.match(/^(\d{4})-W(\d{2})$/)
  return m ? `Semana ${m[2]} de ${m[1]}` : semanaIso
}

function formatFecha(d: Date | string) {
  return format(new Date(d), "d MMM yyyy", { locale: es })
}

function ReporteCard({ reporte }: { reporte: ReporteInforme }) {
  const estado = reporte.estado as EstadoReporteSeguridad

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Top row: semana + estado + link */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="font-semibold text-sm">{semanaLabel(reporte.semanaIso)}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatFecha(reporte.fechaInicio)} — {formatFecha(reporte.fechaFin)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn('text-[10px] border flex items-center gap-1', ESTADO_COLOR[estado])}>
              {ESTADO_ICON[estado]}
              {ESTADO_REPORTE_LABELS[estado]}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
              <Link href={`/seguridad/reportes-semanales/${reporte.id}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Ver
              </Link>
            </Button>
          </div>
        </div>

        {/* Engineer */}
        <p className="text-xs text-muted-foreground">
          Ingeniero: <span className="text-foreground">{reporte.ingeniero.name ?? reporte.ingeniero.email}</span>
        </p>

        {/* Mini KPIs if filled */}
        {(reporte.horasHombre != null || reporte.incidentesCount != null || reporte.personasCapacitadas != null) && (
          <div className="flex items-center gap-4 text-xs flex-wrap">
            {reporte.horasHombre != null && (
              <span className="text-muted-foreground">
                HHT: <strong className="text-foreground">{reporte.horasHombre.toFixed(1)}</strong>
              </span>
            )}
            {reporte.incidentesCount != null && (
              <span className={cn('text-muted-foreground', reporte.incidentesCount > 0 && 'text-red-600')}>
                Incidentes: <strong>{reporte.incidentesCount}</strong>
              </span>
            )}
            {reporte.personasCapacitadas != null && (
              <span className="text-muted-foreground">
                Capacitados: <strong className="text-foreground">{reporte.personasCapacitadas}</strong>
              </span>
            )}
          </div>
        )}

        {/* Resumen ejecutivo (truncado) */}
        {reporte.resumenEjecutivo && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {reporte.resumenEjecutivo}
          </p>
        )}

        {/* Aprobación / Rechazo */}
        {estado === 'aprobado' && reporte.aprobadoAt && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Aprobado el {formatFecha(reporte.aprobadoAt)}
            {reporte.aprobador && ` por ${reporte.aprobador.name ?? '—'}`}
          </p>
        )}
        {estado === 'rechazado' && reporte.notasRevision && (
          <div className="rounded border border-red-200 bg-red-50 p-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-red-700 flex items-center gap-1">
              <MessageSquareWarning className="h-3 w-3" /> Motivo del rechazo
            </p>
            <p className="text-xs text-red-700 whitespace-pre-wrap">{reporte.notasRevision}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PestañaReportesSemanales({ data }: { data: InformeMensualAgregado }) {
  const reportes = data.reportesSemanales

  if (reportes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          No se han creado reportes semanales para este mes.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/seguridad/reportes-semanales">
            Crear nuevo <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>
    )
  }

  const aprobados = reportes.filter((r) => r.estado === 'aprobado').length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{reportes.length}</strong> reporte{reportes.length !== 1 ? 's' : ''}
        </span>
        {aprobados > 0 && (
          <span className="text-emerald-600">
            <strong>{aprobados}</strong> aprobado{aprobados !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {reportes.map((r) => (
          <ReporteCard key={r.id} reporte={r} />
        ))}
      </div>
    </div>
  )
}
