'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  Eye,
  Leaf,
  Activity,
  Heart,
  ShieldAlert,
  Clock,
  Users,
  CalendarCheck,
} from 'lucide-react'
import { KpiCard } from './KpiCard'
import type { InformeMensualAgregado } from '@/lib/services/informeMensualSeguridad'

const TIPO_META: Record<string, { label: string; color: string }> = {
  charla:            { label: 'Charlas',           color: '#3b82f6' },
  inspeccion:        { label: 'Inspecciones',      color: '#8b5cf6' },
  observacion:       { label: 'Observaciones',     color: '#f59e0b' },
  incidente:         { label: 'Incidentes',        color: '#ef4444' },
  riesgo_critico:    { label: 'Riesgo crítico',    color: '#dc2626' },
  actividad_general: { label: 'Act. general',      color: '#64748b' },
  medio_ambiente:    { label: 'Medio ambiente',    color: '#10b981' },
  prevencion_salud:  { label: 'Prev. salud',       color: '#06b6d4' },
}

function generarParrafoResumen(
  data: InformeMensualAgregado,
): string {
  const { kpis, proyecto, periodo } = data
  const totalRegistros =
    kpis.charlasCount + kpis.inspeccionesCount + kpis.observacionesCount +
    kpis.incidentesCount + kpis.riesgoCriticoCount + kpis.medioAmbienteCount +
    kpis.prevencionSaludCount + kpis.actividadGeneralCount

  const partes: string[] = []
  partes.push(
    `En ${periodo.labelMes}, el proyecto ${proyecto.nombre} registró ${kpis.jornadasTotal} jornada${kpis.jornadasTotal !== 1 ? 's' : ''} de campo con ${kpis.personalUnico} persona${kpis.personalUnico !== 1 ? 's' : ''} únicas, acumulando ${kpis.hht.toFixed(1)} HHT.`,
  )
  if (totalRegistros > 0) {
    partes.push(
      `Se generaron ${totalRegistros} registro${totalRegistros !== 1 ? 's' : ''} de seguridad${kpis.charlasCount > 0 ? `, incluyendo ${kpis.charlasCount} charla${kpis.charlasCount !== 1 ? 's' : ''} con ${kpis.asistentesCharlas} asistente${kpis.asistentesCharlas !== 1 ? 's' : ''}` : ''}.`,
    )
  }
  partes.push(
    `Días sin accidentes: ${kpis.diasSinAccidentes}.${kpis.incidentesCount > 0 ? ` Se reportaron ${kpis.incidentesCount} incidente${kpis.incidentesCount !== 1 ? 's' : ''}.` : ''}`,
  )
  return partes.join(' ')
}

export function PestañaResumen({ data }: { data: InformeMensualAgregado }) {
  const { kpis, periodo } = data

  const chartData = Object.entries(TIPO_META)
    .map(([tipo, meta]) => {
      const count =
        tipo === 'charla' ? kpis.charlasCount :
        tipo === 'inspeccion' ? kpis.inspeccionesCount :
        tipo === 'observacion' ? kpis.observacionesCount :
        tipo === 'incidente' ? kpis.incidentesCount :
        tipo === 'riesgo_critico' ? kpis.riesgoCriticoCount :
        tipo === 'actividad_general' ? kpis.actividadGeneralCount :
        tipo === 'medio_ambiente' ? kpis.medioAmbienteCount :
        kpis.prevencionSaludCount
      return { name: meta.label, count, color: meta.color }
    })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)

  const totalRegistros = chartData.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-6">
      {/* KPI grid principal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard
          label="HHT del mes"
          value={kpis.hht.toFixed(1)}
          icon={Clock}
          subtitle={`${kpis.hhtAcumulado.toFixed(1)} acumulado`}
        />
        <KpiCard
          label="Personal único"
          value={kpis.personalUnico}
          icon={Users}
          subtitle={`${periodo.diasLaborables} días laborables`}
        />
        <KpiCard
          label="Jornadas"
          value={kpis.jornadasTotal}
          icon={CalendarCheck}
          subtitle={`${kpis.jornadasAprobadas} aprobadas`}
          variant={kpis.jornadasAprobadas === kpis.jornadasTotal && kpis.jornadasTotal > 0 ? 'success' : 'default'}
        />
        <KpiCard
          label="Días sin accidentes"
          value={kpis.diasSinAccidentes}
          icon={ShieldAlert}
          variant={kpis.incidentesCount > 0 ? 'danger' : kpis.diasSinAccidentes > 0 ? 'success' : 'default'}
        />
        <KpiCard
          label="Charlas"
          value={kpis.charlasCount}
          icon={BookOpen}
          subtitle={`${kpis.asistentesCharlas} asistentes`}
        />
        <KpiCard
          label="Inspecciones"
          value={kpis.inspeccionesCount}
          icon={ClipboardCheck}
        />
        <KpiCard
          label="Observaciones"
          value={kpis.observacionesCount}
          icon={Eye}
        />
        <KpiCard
          label="Incidentes"
          value={kpis.incidentesCount}
          icon={AlertTriangle}
          variant={kpis.incidentesCount > 0 ? 'danger' : 'success'}
        />
        <KpiCard
          label="Riesgo crítico"
          value={kpis.riesgoCriticoCount}
          icon={Activity}
          variant={kpis.riesgoCriticoCount > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          label="Medio ambiente"
          value={kpis.medioAmbienteCount}
          icon={Leaf}
        />
        <KpiCard
          label="Prev. salud"
          value={kpis.prevencionSaludCount}
          icon={Heart}
        />
        <KpiCard
          label="Entregas EPP"
          value={kpis.entregasEppCount}
        />
      </div>

      {/* Distribución de registros */}
      {chartData.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Distribución de registros de seguridad</h3>
            <span className="text-xs text-muted-foreground">{totalRegistros} total</span>
          </div>
          <ResponsiveContainer width="100%" height={chartData.length * 36 + 24}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 40, top: 4, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val) => [val, 'Registros']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12 }}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Párrafo resumen auto-generado */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Resumen del período
        </p>
        <p className="text-sm leading-relaxed">{generarParrafoResumen(data)}</p>
      </div>
    </div>
  )
}
