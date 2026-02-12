'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Package,
  Users,
  BarChart3,
  ArrowRight,
  Activity,
  Truck,
  ShieldCheck,
  Info,
} from 'lucide-react'
import Link from 'next/link'

// Types for KPI data
interface KpiData {
  comercial: {
    winRate: { valor: number; meta: number; ganadas: number; perdidas: number; total: number }
    pipelinePonderado: { valor: number; pipelineTotal: number; oportunidadesActivas: number }
    margen: { cotizado: number; real: number; diferencia: number; proyectosAnalizados: number }
  }
  proyectos: {
    desviacionHoras: { valor: number; horasPlan: number; horasReales: number; edtsConDesviacion: number; totalEdts: number }
    proyectosEnRojo: { valor: number; total: number; porcentaje: number; detalle: { codigo: string; nombre: string; sobrecosto: number }[] }
    tareasAtrasadas: { valor: number; totalActivas: number; porcentaje: number }
    proyectosActivos: number
    progresoPromedio: number
  }
  logistica: {
    entregaATiempo: { valor: number; meta: number; aTiempo: number; total: number }
    ciclo: { lista: number; pedido: number; listasAnalizadas: number; pedidosAnalizados: number }
    sobrecostoEquipos: { valor: number; presupuesto: number; costoReal: number; itemsConSobrecosto: number; totalItems: number }
    estadoEntregas: { pendientes: number; enProceso: number; entregados: number; retrasados: number; total: number }
  }
  financiero: {
    margenReal: { promedio: number; totalRevenue: number; totalCost: number; gananciaTotal: number; proyectosAnalizados: number; peores: { codigo: string; nombre: string; margen: number }[]; mejores: { codigo: string; nombre: string; margen: number }[] }
    utilizacionRecursos: { promedio: number; meta: number; personasActivas: number; horasDisponiblesPorPersona: number }
    saludProyectos: { promedio: number; distribucion: { verde: number; amarillo: number; rojo: number }; detalle: { codigo: string; nombre: string; score: number; estado: 'verde' | 'amarillo' | 'rojo' }[] }
  }
  timestamp: string
}

interface KpiDashboardProps {
  userRole: string
}

// Semaphore color helper
function getSemaphore(value: number, thresholds: { green: number; yellow: number }, inverted = false) {
  if (inverted) {
    // Lower is better (e.g., overdue tasks, overruns)
    if (value <= thresholds.green) return 'green'
    if (value <= thresholds.yellow) return 'yellow'
    return 'red'
  }
  // Higher is better (e.g., win rate, on-time delivery)
  if (value >= thresholds.green) return 'green'
  if (value >= thresholds.yellow) return 'yellow'
  return 'red'
}

function SemaphoreIndicator({ color }: { color: 'green' | 'yellow' | 'red' }) {
  const colors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
  }
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[color]} shrink-0`} />
}

function KpiValue({ value, suffix = '', prefix = '' }: { value: number | string; suffix?: string; prefix?: string }) {
  return (
    <span className="text-2xl font-bold tracking-tight">
      {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
    </span>
  )
}

function KpiSubtext({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-0.5">{children}</p>
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

export function KpiDashboard({ userRole }: KpiDashboardProps) {
  const [data, setData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/gestion/kpis')
      if (!res.ok) throw new Error('Error al cargar KPIs')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-5 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { comercial, proyectos, logistica, financiero } = data

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">KPIs de Gestión</h1>
            <p className="text-xs text-muted-foreground">
              Dashboard ejecutivo - actualizado {data.timestamp ? new Date(data.timestamp).toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/gestion/reportes">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <BarChart3 className="w-3.5 h-3.5 mr-1" />
                Reportes
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-7 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* 4 Quadrants Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ============ Q1: COMERCIAL ============ */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Target className="w-4 h-4 text-blue-500" />
                Comercial
                <Badge variant="outline" className="ml-auto text-[10px] font-normal">
                  Equipo de Ventas
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              {/* Win Rate */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    Win Rate
                    <InfoTooltip text="Porcentaje de oportunidades ganadas vs total cerradas. Meta: ≥30%" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SemaphoreIndicator color={getSemaphore(comercial.winRate.valor, { green: 30, yellow: 20 })} />
                    <KpiValue value={comercial.winRate.valor} suffix="%" />
                  </div>
                  <KpiSubtext>
                    {comercial.winRate.ganadas} ganadas / {comercial.winRate.total} cerradas
                  </KpiSubtext>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <span className="text-[10px]">Meta</span>
                  <div className="font-semibold">{comercial.winRate.meta}%</div>
                </div>
              </div>

              <div className="border-t" />

              {/* Pipeline Ponderado */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                  Pipeline Ponderado
                  <InfoTooltip text="Suma de (valor estimado × probabilidad) de oportunidades activas" />
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                  <KpiValue value={comercial.pipelinePonderado.valor} prefix="$" />
                </div>
                <KpiSubtext>
                  ${comercial.pipelinePonderado.pipelineTotal.toLocaleString()} total en {comercial.pipelinePonderado.oportunidadesActivas} oportunidades
                </KpiSubtext>
              </div>

              <div className="border-t" />

              {/* Margen Cotizado vs Real */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                  Margen: Cotizado vs Real
                  <InfoTooltip text="Compara el margen prometido en cotización vs el margen real logrado en ejecución" />
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Cotizado</span>
                    <div className="text-lg font-bold">{comercial.margen.cotizado}%</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">Real</span>
                    <div className={`text-lg font-bold ${comercial.margen.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {comercial.margen.real}%
                    </div>
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs ${comercial.margen.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {comercial.margen.diferencia >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {comercial.margen.diferencia > 0 ? '+' : ''}{comercial.margen.diferencia}%
                  </div>
                </div>
                <KpiSubtext>{comercial.margen.proyectosAnalizados} proyectos analizados</KpiSubtext>
              </div>
            </CardContent>
          </Card>

          {/* ============ Q2: PROYECTOS ============ */}
          <Card className="border-l-4 border-l-violet-500">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="w-4 h-4 text-violet-500" />
                Proyectos
                <Badge variant="outline" className="ml-auto text-[10px] font-normal">
                  {proyectos.proyectosActivos} activos &middot; {proyectos.progresoPromedio}% promedio
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              {/* Desviación de Horas */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    Desviación de Horas
                    <InfoTooltip text="% de desviación entre horas planificadas y reales por EDT. Negativo = eficiente, Positivo = sobrecosto" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SemaphoreIndicator color={getSemaphore(Math.abs(proyectos.desviacionHoras.valor), { green: 10, yellow: 25 }, true)} />
                    <KpiValue value={proyectos.desviacionHoras.valor > 0 ? `+${proyectos.desviacionHoras.valor}` : `${proyectos.desviacionHoras.valor}`} suffix="%" />
                  </div>
                  <KpiSubtext>
                    {proyectos.desviacionHoras.horasPlan}h plan → {proyectos.desviacionHoras.horasReales}h real
                  </KpiSubtext>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <span className="text-[10px]">EDTs pasados</span>
                  <div className="font-semibold text-amber-600">{proyectos.desviacionHoras.edtsConDesviacion}/{proyectos.desviacionHoras.totalEdts}</div>
                </div>
              </div>

              <div className="border-t" />

              {/* Proyectos en Rojo */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                  Proyectos en Rojo
                  <InfoTooltip text="Proyectos donde el costo real supera el presupuesto interno" />
                </div>
                <div className="flex items-center gap-2">
                  <SemaphoreIndicator color={getSemaphore(proyectos.proyectosEnRojo.porcentaje, { green: 10, yellow: 30 }, true)} />
                  <span className="text-2xl font-bold tracking-tight text-red-600">
                    {proyectos.proyectosEnRojo.valor}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {proyectos.proyectosEnRojo.total} con costos</span>
                </div>
                {proyectos.proyectosEnRojo.detalle.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {proyectos.proyectosEnRojo.detalle.map(p => (
                      <div key={p.codigo} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[200px]">{p.codigo} - {p.nombre}</span>
                        <span className="text-red-600 font-medium">+{p.sobrecosto}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t" />

              {/* Tareas Atrasadas */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    Tareas Atrasadas
                    <InfoTooltip text="Tareas pendientes o en progreso cuya fecha fin ya pasó" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SemaphoreIndicator color={getSemaphore(proyectos.tareasAtrasadas.porcentaje, { green: 5, yellow: 15 }, true)} />
                    <KpiValue value={proyectos.tareasAtrasadas.valor} />
                  </div>
                  <KpiSubtext>
                    {proyectos.tareasAtrasadas.porcentaje}% de {proyectos.tareasAtrasadas.totalActivas} activas
                  </KpiSubtext>
                </div>
                <div className="text-right">
                  {proyectos.tareasAtrasadas.valor > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============ Q3: LOGÍSTICA ============ */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="w-4 h-4 text-orange-500" />
                Logística
                <Badge variant="outline" className="ml-auto text-[10px] font-normal">
                  {logistica.estadoEntregas.total} items en seguimiento
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              {/* Entrega a Tiempo */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    Entrega a Tiempo
                    <InfoTooltip text="% de items entregados dentro de la fecha estimada. Meta: ≥95%" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SemaphoreIndicator color={getSemaphore(logistica.entregaATiempo.valor, { green: 95, yellow: 80 })} />
                    <KpiValue value={logistica.entregaATiempo.valor} suffix="%" />
                  </div>
                  <KpiSubtext>
                    {logistica.entregaATiempo.aTiempo} de {logistica.entregaATiempo.total} entregas
                  </KpiSubtext>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <span className="text-[10px]">Meta</span>
                  <div className="font-semibold">{logistica.entregaATiempo.meta}%</div>
                </div>
              </div>

              <div className="border-t" />

              {/* Ciclo de Aprovisionamiento */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                  Ciclo de Aprovisionamiento
                  <InfoTooltip text="Días promedio desde creación de lista hasta aprobación, y desde pedido hasta entrega" />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-500" />
                      <span className="text-lg font-bold">{logistica.ciclo.lista}d</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Lista→Aprobación</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-orange-500" />
                      <span className="text-lg font-bold">{logistica.ciclo.pedido}d</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Pedido→Entrega</span>
                  </div>
                </div>
                <KpiSubtext>
                  {logistica.ciclo.listasAnalizadas} listas, {logistica.ciclo.pedidosAnalizados} pedidos analizados
                </KpiSubtext>
              </div>

              <div className="border-t" />

              {/* Sobrecosto Equipos + Estado Entregas */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    Sobrecosto Equipos
                    <InfoTooltip text="Diferencia entre presupuesto y costo real de equipos. Negativo = ahorro" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SemaphoreIndicator color={getSemaphore(logistica.sobrecostoEquipos.valor, { green: 5, yellow: 15 }, true)} />
                    <span className={`text-2xl font-bold tracking-tight ${logistica.sobrecostoEquipos.valor <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {logistica.sobrecostoEquipos.valor > 0 ? '+' : ''}{logistica.sobrecostoEquipos.valor}%
                    </span>
                  </div>
                  <KpiSubtext>
                    ${logistica.sobrecostoEquipos.presupuesto.toLocaleString()} ppto → ${logistica.sobrecostoEquipos.costoReal.toLocaleString()} real
                  </KpiSubtext>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{logistica.estadoEntregas.pendientes} pend</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{logistica.estadoEntregas.enProceso} proc</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{logistica.estadoEntregas.entregados} ok</span>
                  </div>
                  {logistica.estadoEntregas.retrasados > 0 && (
                    <div className="flex items-center gap-1 text-red-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>{logistica.estadoEntregas.retrasados} retr</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============ Q4: FINANCIERO / GERENCIA ============ */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Financiero
                <Badge variant="outline" className="ml-auto text-[10px] font-normal">
                  Visión Ejecutiva
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              {/* Margen Real */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    Margen Real Promedio
                    <InfoTooltip text="Margen real: (precio cliente - costo real) / precio cliente × 100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SemaphoreIndicator color={getSemaphore(financiero.margenReal.promedio, { green: 25, yellow: 15 })} />
                    <KpiValue value={financiero.margenReal.promedio} suffix="%" />
                  </div>
                  <KpiSubtext>
                    Ganancia: ${financiero.margenReal.gananciaTotal.toLocaleString()} en {financiero.margenReal.proyectosAnalizados} proyectos
                  </KpiSubtext>
                </div>
                <div className="text-right text-xs">
                  <div className="text-muted-foreground text-[10px]">Revenue</div>
                  <div className="font-semibold">${financiero.margenReal.totalRevenue.toLocaleString()}</div>
                </div>
              </div>

              <div className="border-t" />

              {/* Utilización de Recursos */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    Utilización de Recursos
                    <InfoTooltip text="Horas registradas este mes vs horas disponibles según calendario laboral. Meta: 75-85%" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SemaphoreIndicator color={
                      financiero.utilizacionRecursos.promedio >= 85 ? 'yellow' :
                      financiero.utilizacionRecursos.promedio >= 60 ? 'green' : 'red'
                    } />
                    <KpiValue value={financiero.utilizacionRecursos.promedio} suffix="%" />
                  </div>
                  <KpiSubtext>
                    {financiero.utilizacionRecursos.personasActivas} personas activas este mes
                  </KpiSubtext>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <span className="text-[10px]">Meta</span>
                  <div className="font-semibold">{financiero.utilizacionRecursos.meta}%</div>
                </div>
              </div>

              <div className="border-t" />

              {/* Salud de Proyectos */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                  Salud de Proyectos
                  <InfoTooltip text="Score compuesto basado en desviación de costos y progreso. Verde ≥80, Amarillo ≥50, Rojo <50" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 ${
                      financiero.saludProyectos.promedio >= 80 ? 'text-emerald-500' :
                      financiero.saludProyectos.promedio >= 50 ? 'text-amber-500' : 'text-red-500'
                    }`} />
                    <KpiValue value={financiero.saludProyectos.promedio} suffix="pts" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {financiero.saludProyectos.distribucion.verde}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {financiero.saludProyectos.distribucion.amarillo}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {financiero.saludProyectos.distribucion.rojo}
                    </span>
                  </div>
                </div>
                {financiero.saludProyectos.detalle.filter(p => p.estado !== 'verde').length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {financiero.saludProyectos.detalle.filter(p => p.estado !== 'verde').slice(0, 3).map(p => (
                      <div key={p.codigo} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[200px]">{p.codigo} - {p.nombre}</span>
                        <div className="flex items-center gap-1">
                          <SemaphoreIndicator color={p.estado === 'verde' ? 'green' : p.estado === 'amarillo' ? 'yellow' : 'red'} />
                          <span className="font-medium">{p.score}pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Footer links */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Saludable</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Atención</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Crítico</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/crm" className="hover:text-foreground transition-colors">CRM</Link>
            <span>&middot;</span>
            <Link href="/proyectos" className="hover:text-foreground transition-colors">Proyectos</Link>
            <span>&middot;</span>
            <Link href="/logistica/pedidos" className="hover:text-foreground transition-colors">Logística</Link>
            <span>&middot;</span>
            <Link href="/gestion/reportes" className="hover:text-foreground transition-colors">Reportes Detallados</Link>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
