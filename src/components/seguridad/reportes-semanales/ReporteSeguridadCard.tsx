'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ESTADO_REPORTE_LABELS, type EstadoReporteSeguridad } from '@/lib/validators/reporteSeguridad'
import type { ReporteSeguridadDetalle } from '@/lib/services/reporteSeguridad'

const ESTADO_COLOR: Record<EstadoReporteSeguridad, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviado: 'bg-blue-100 text-blue-700 border-blue-200',
  aprobado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rechazado: 'bg-red-100 text-red-700 border-red-200',
}

function semanaLabel(semana: string): string {
  const m = semana.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return semana
  return `Semana ${m[2]} · ${m[1]}`
}

interface Props {
  reporte: ReporteSeguridadDetalle
}

export function ReporteSeguridadCard({ reporte }: Props) {
  return (
    <Link href={`/seguridad/reportes-semanales/${reporte.id}`}>
      <Card className="hover:shadow-md transition cursor-pointer">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm leading-tight">{reporte.proyecto.nombre}</p>
              <p className="text-xs font-mono text-muted-foreground">{reporte.proyecto.codigo}</p>
            </div>
            <Badge className={cn('text-[10px] border shrink-0', ESTADO_COLOR[reporte.estado])}>
              {ESTADO_REPORTE_LABELS[reporte.estado]}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {semanaLabel(reporte.semanaIso)}
          </div>
          {reporte.ingeniero.name && (
            <p className="text-xs text-muted-foreground">Ingeniero: {reporte.ingeniero.name}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
