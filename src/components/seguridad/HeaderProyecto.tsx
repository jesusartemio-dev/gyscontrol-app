'use client'

import Link from 'next/link'
import { ArrowLeft, Building2, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { KpisMensuales } from '@/lib/validators/informeMensual'

interface ProyectoResumen {
  id: string
  codigo: string
  nombre: string
  estado: string
  cliente: { id: string; nombre: string } | null
  gestor: { id: string; name: string | null; email: string }
}

interface PeriodoResumen {
  mes: string
  labelMes: string
  diasLaborables: number
}

interface Props {
  proyecto: ProyectoResumen
  periodo: PeriodoResumen
  kpis: KpisMensuales
}

const ESTADO_COLOR: Record<string, string> = {
  creado: 'bg-gray-100 text-gray-700 border-gray-200',
  en_planificacion: 'bg-blue-100 text-blue-700 border-blue-200',
  listas_pendientes: 'bg-amber-100 text-amber-700 border-amber-200',
  listas_aprobadas: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pedidos_creados: 'bg-orange-100 text-orange-700 border-orange-200',
  en_ejecucion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  en_cierre: 'bg-purple-100 text-purple-700 border-purple-200',
  finalizado: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelado: 'bg-red-100 text-red-700 border-red-200',
}

const ESTADO_LABELS: Record<string, string> = {
  creado: 'Creado',
  en_planificacion: 'En planificación',
  listas_pendientes: 'Listas pendientes',
  listas_aprobadas: 'Listas aprobadas',
  pedidos_creados: 'Pedidos creados',
  en_ejecucion: 'En ejecución',
  en_cierre: 'En cierre',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export function HeaderProyecto({ proyecto, periodo, kpis }: Props) {
  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Fila superior: volver + info proyecto */}
        <div className="flex items-start gap-3">
          <Link href="/seguridad/proyectos">
            <Button variant="ghost" size="sm" className="shrink-0 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Proyectos
            </Button>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{proyecto.codigo}</p>
                <h1 className="text-lg font-bold leading-tight mt-0.5 truncate">
                  {proyecto.nombre}
                </h1>
              </div>
              <Badge
                className={cn(
                  'text-[10px] border shrink-0',
                  ESTADO_COLOR[proyecto.estado] ?? 'bg-gray-100 text-gray-700 border-gray-200',
                )}
              >
                {ESTADO_LABELS[proyecto.estado] ?? proyecto.estado}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {proyecto.cliente && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {proyecto.cliente.nombre}
                </span>
              )}
              {proyecto.gestor?.name && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  {proyecto.gestor.name}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                {periodo.labelMes} · {periodo.diasLaborables} días laborables
              </span>
            </div>
          </div>
        </div>

        {/* Mini KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">HHT del mes</p>
            <p className="text-2xl font-bold tabular-nums">{kpis.hht.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">
              {kpis.hhtAcumulado.toFixed(1)} acumulado
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Personal</p>
            <p className="text-2xl font-bold tabular-nums">{kpis.personalUnico}</p>
            <p className="text-[10px] text-muted-foreground">personas únicas</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Jornadas</p>
            <p className="text-2xl font-bold tabular-nums">{kpis.jornadasTotal}</p>
            <p className="text-[10px] text-muted-foreground">
              {kpis.jornadasAprobadas} aprobadas · {kpis.jornadasConEvidencia} con evidencia
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
