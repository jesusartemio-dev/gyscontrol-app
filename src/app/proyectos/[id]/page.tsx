'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package,
  Wrench,
  Receipt,
  Calendar,
  ChevronRight,
  ClipboardList,
  Truck,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckSquare
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { useProyectoContext } from './ProyectoContext'

// Utility function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Calculate progress percentage (real vs plan)
const calcularProgreso = (real: number, plan: number): { porcentaje: number; estado: 'ok' | 'warning' | 'danger' } => {
  if (plan === 0) return { porcentaje: 0, estado: 'ok' }
  const porcentaje = Math.min((real / plan) * 100, 150) // Cap at 150%

  let estado: 'ok' | 'warning' | 'danger' = 'ok'
  if (porcentaje > 100) estado = 'danger'
  else if (porcentaje > 80) estado = 'warning'

  return { porcentaje, estado }
}

// Get progress color classes
const getProgressColor = (estado: 'ok' | 'warning' | 'danger'): string => {
  switch (estado) {
    case 'danger': return 'bg-red-500'
    case 'warning': return 'bg-amber-500'
    default: return 'bg-emerald-500'
  }
}

export default function ProyectoHubPage() {
  const router = useRouter()
  const { proyecto, cronogramaStats } = useProyectoContext()

  if (!proyecto) return null

  // Calculate statistics
  const totalEquipos = proyecto.equipos?.length || 0
  const totalEquiposItems = proyecto.equipos?.reduce((acc, e) => acc + (e.items?.length || 0), 0) || 0
  const totalEquiposCliente = proyecto.equipos?.reduce((acc, e) => acc + (e.subtotalCliente || 0), 0) || 0
  // Cobertura: ítems cotizados ya vinculados a listas (en_lista, reemplazado, descartado)
  const equiposItemsEnLista = proyecto.equipos?.reduce((acc, e) =>
    acc + (e.items?.filter((i: any) => i.estado && i.estado !== 'pendiente').length || 0), 0) || 0
  const progresoCobertura = totalEquiposItems > 0
    ? { porcentaje: (equiposItemsEnLista / totalEquiposItems) * 100, estado: 'ok' as const }
    : null
  const totalServicios = proyecto.servicios?.length || 0
  const totalServiciosItems = proyecto.servicios?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0
  const totalServiciosCliente = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalCliente || 0), 0) || 0
  const totalServiciosReal = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalReal || 0), 0) || 0
  const totalGastos = proyecto.gastos?.length || 0
  const totalGastosItems = proyecto.gastos?.reduce((acc, g) => acc + (g.items?.length || 0), 0) || 0
  const totalGastosCliente = proyecto.gastos?.reduce((acc, g) => acc + (g.subtotalCliente || 0), 0) || 0
  const totalGastosReal = proyecto.gastos?.reduce((acc, g) => acc + (g.subtotalReal || 0), 0) || 0
  const totalListas = proyecto.listaEquipos?.length || 0
  const totalListasItems = proyecto.listaEquipos?.reduce((acc, l) => acc + (l.listaEquipoItem?.length || 0), 0) || 0
  const totalListasPresupuesto = proyecto.listaEquipos?.reduce((acc, l) =>
    acc + (l.listaEquipoItem?.reduce((s, i) => s + (i.presupuesto || 0), 0) || 0), 0) || 0
  const listasAprobadas = proyecto.listaEquipos?.filter(l =>
    l.estado === 'aprobada' || l.estado === 'completada').length || 0
  const progresoListas = totalListas > 0
    ? { porcentaje: (listasAprobadas / totalListas) * 100, estado: 'ok' as const }
    : null

  const totalPedidos = proyecto.pedidos?.length || 0
  const pedidosEntregados = proyecto.pedidos?.filter(p => p.estado === 'entregado').length || 0
  const pedidosUrgentes = proyecto.pedidos?.filter(p => p.esUrgente).length || 0
  const pedidosCostoReal = proyecto.pedidos?.reduce((acc, p) => acc + (p.costoRealTotal || 0), 0) || 0
  const pedidosPresupuesto = proyecto.pedidos?.reduce((acc, p) => acc + (p.presupuestoTotal || 0), 0) || 0
  const progresoPedidosEntrega = totalPedidos > 0
    ? { porcentaje: (pedidosEntregados / totalPedidos) * 100, estado: 'ok' as const }
    : null
  const progresoPedidosCosto = calcularProgreso(pedidosCostoReal, pedidosPresupuesto)

  // Calculate progress for each category
  const progresoServicios = calcularProgreso(totalServiciosReal, totalServiciosCliente)
  const progresoGastos = calcularProgreso(totalGastosReal, totalGastosCliente)

  const baseUrl = `/proyectos/${proyecto.id}`

  // Tareas progress
  const progresoTareas = cronogramaStats.tareas > 0
    ? { porcentaje: (cronogramaStats.tareasCompletadas / cronogramaStats.tareas) * 100, estado: 'ok' as const }
    : null

  // Cronograma hours progress
  const progresoHoras = calcularProgreso(cronogramaStats.horasReales, cronogramaStats.horasPlan)

  // Grid order: row by row (3 cols)
  // Row 1: Equipos | Servicios | Gastos
  // Row 2: Listas  | Cronograma | Personal
  // Row 3: Pedidos | Tareas    |
  const navigationCards = [
    // Row 1 — Cotizados
    {
      id: 'equipos',
      title: 'Equipos',
      description: 'Gestionar equipos del proyecto',
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      hoverBg: 'hover:bg-blue-50',
      borderColor: 'border-blue-200',
      href: `${baseUrl}/equipos`,
      stats: [
        { label: 'Grupos', value: totalEquipos },
        { label: 'Items', value: totalEquiposItems },
        { label: 'En listas', value: equiposItemsEnLista },
      ],
      total: totalEquiposCliente,
      cobertura: progresoCobertura,
    },
    {
      id: 'servicios',
      title: 'Servicios',
      description: 'Gestionar servicios del proyecto',
      icon: Wrench,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
      hoverBg: 'hover:bg-indigo-50',
      borderColor: 'border-indigo-200',
      href: `${baseUrl}/servicios`,
      stats: [
        { label: 'Grupos', value: totalServicios },
        { label: 'Items', value: totalServiciosItems },
      ],
      total: totalServiciosCliente,
      progreso: progresoServicios,
      real: totalServiciosReal,
      plan: totalServiciosCliente
    },
    {
      id: 'gastos',
      title: 'Gastos',
      description: 'Gestionar gastos del proyecto',
      icon: Receipt,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      hoverBg: 'hover:bg-orange-50',
      borderColor: 'border-orange-200',
      href: `${baseUrl}/gastos`,
      stats: [
        { label: 'Grupos', value: totalGastos },
        { label: 'Items', value: totalGastosItems },
      ],
      total: totalGastosCliente,
      progreso: progresoGastos,
      real: totalGastosReal,
      plan: totalGastosCliente
    },
    // Row 2
    {
      id: 'listas',
      title: 'Listas',
      description: 'Gestionar listas técnicas',
      icon: ClipboardList,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      hoverBg: 'hover:bg-emerald-50',
      borderColor: 'border-emerald-200',
      href: `${baseUrl}/equipos/listas`,
      stats: [
        { label: 'Listas', value: totalListas },
        { label: 'Items', value: totalListasItems },
        { label: 'Aprobadas', value: listasAprobadas },
      ],
      total: totalListasPresupuesto,
      cobertura: progresoListas,
      coberturaLabel: 'Aprobación',
    },
    {
      id: 'cronograma',
      title: 'Cronograma',
      description: 'Fases, EDTs y actividades',
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      hoverBg: 'hover:bg-purple-50',
      borderColor: 'border-purple-200',
      href: `${baseUrl}/cronograma`,
      stats: [
        { label: 'Fases', value: cronogramaStats.fases },
        { label: 'Activas', value: cronogramaStats.fasesEnProgreso },
        { label: 'EDTs', value: cronogramaStats.edts },
      ],
      progreso: progresoHoras,
      real: cronogramaStats.horasReales,
      plan: cronogramaStats.horasPlan,
      realLabel: `${Math.round(cronogramaStats.horasReales)}h / ${Math.round(cronogramaStats.horasPlan)}h`,
      badge: cronogramaStats.activeCronograma?.nombre || 'Cronograma'
    },
    {
      id: 'personal',
      title: 'Personal',
      description: 'Equipo de trabajo del proyecto',
      icon: Users,
      color: 'text-teal-500',
      bgColor: 'bg-teal-50',
      hoverBg: 'hover:bg-teal-50',
      borderColor: 'border-teal-200',
      href: `${baseUrl}/personal`,
      stats: [
        { label: 'Gestor', value: proyecto.gestor?.name ? 1 : 0 },
        { label: 'Supervisor', value: proyecto.supervisor?.name ? 1 : 0 },
      ],
      badge: proyecto.gestor?.name || 'Sin asignar'
    },
    // Row 3
    {
      id: 'pedidos',
      title: 'Pedidos',
      description: 'Gestionar pedidos de compra',
      icon: Truck,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50',
      hoverBg: 'hover:bg-cyan-50',
      borderColor: 'border-cyan-200',
      href: `${baseUrl}/equipos/pedidos`,
      stats: [
        { label: 'Pedidos', value: totalPedidos },
        { label: 'Entregados', value: pedidosEntregados },
        ...(pedidosUrgentes > 0 ? [{ label: 'Urgentes', value: pedidosUrgentes }] : []),
      ],
      cobertura: progresoPedidosEntrega,
      coberturaLabel: 'Entrega',
      progreso: progresoPedidosCosto,
      real: pedidosCostoReal,
      plan: pedidosPresupuesto
    },
    {
      id: 'tareas',
      title: 'Tareas',
      description: 'Seguimiento de tareas del proyecto',
      icon: CheckSquare,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      hoverBg: 'hover:bg-amber-50',
      borderColor: 'border-amber-200',
      href: `${baseUrl}/cronograma`,
      stats: [
        { label: 'Total', value: cronogramaStats.tareas },
        { label: 'En progreso', value: cronogramaStats.tareasEnProgreso },
        { label: 'Completadas', value: cronogramaStats.tareasCompletadas },
      ],
      cobertura: progresoTareas,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {navigationCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${card.hoverBg} group border-l-4 ${card.borderColor}`}
              onClick={() => router.push(card.href)}
            >
              <CardContent className="p-3 space-y-2">
                {/* Row 1: Icon + Title + Amount/Badge + Chevron */}
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${card.bgColor}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <span className="font-semibold text-sm group-hover:text-primary flex-1">
                    {card.title}
                  </span>
                  {card.badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      {card.badge}
                    </Badge>
                  )}
                  {card.total !== undefined && card.total > 0 && (
                    <span className="text-xs font-semibold text-gray-600">
                      {formatCurrency(card.total)}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>

                {/* Row 2: Stats */}
                <div className="flex items-center gap-3 text-xs">
                  {card.stats && card.stats.length > 0 ? (
                    card.stats.map((stat, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900">{stat.value}</span>
                        <span className="text-muted-foreground">{stat.label}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Ver detalles</span>
                  )}
                </div>

                {/* Progress bar for cost tracking */}
                {card.progreso && card.plan && card.plan > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {card.progreso.estado === 'danger' ? (
                          <TrendingUp className="h-3 w-3 text-red-500" />
                        ) : card.progreso.estado === 'warning' ? (
                          <TrendingUp className="h-3 w-3 text-amber-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-emerald-500" />
                        )}
                        {card.realLabel || `Real: ${formatCurrency(card.real || 0)}`}
                      </span>
                      <span className={`font-medium ${
                        card.progreso.estado === 'danger' ? 'text-red-600' :
                        card.progreso.estado === 'warning' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {card.progreso.porcentaje.toFixed(0)}%
                      </span>
                    </div>
                    <div className="relative h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all ${getProgressColor(card.progreso.estado)}`}
                        style={{ width: `${Math.min(card.progreso.porcentaje, 100)}%` }}
                      />
                      {card.progreso.porcentaje > 100 && (
                        <div
                          className="absolute inset-y-0 bg-red-300 rounded-full"
                          style={{ left: '100%', width: `${Math.min(card.progreso.porcentaje - 100, 50)}%` }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Coverage progress bar */}
                {card.cobertura && card.cobertura.porcentaje >= 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ClipboardList className="h-3 w-3 text-blue-500" />
                        {card.coberturaLabel || 'Cobertura'}
                      </span>
                      <span className={`font-medium ${
                        card.cobertura.porcentaje >= 100 ? 'text-emerald-600' :
                        card.cobertura.porcentaje >= 50 ? 'text-blue-600' :
                        'text-gray-500'
                      }`}>
                        {card.cobertura.porcentaje.toFixed(0)}%
                      </span>
                    </div>
                    <div className="relative h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                          card.cobertura.porcentaje >= 100 ? 'bg-emerald-500' :
                          card.cobertura.porcentaje >= 50 ? 'bg-blue-500' :
                          'bg-blue-300'
                        }`}
                        style={{ width: `${Math.min(card.cobertura.porcentaje, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Status Alert for new projects */}
      {proyecto.estado === 'creado' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.4 }}
        >
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div className="flex-1">
                  <span className="font-medium text-amber-900 text-sm">Proyecto recién creado</span>
                  <span className="text-amber-700 text-xs ml-2">
                    Comienza creando listas técnicas para organizar los equipos.
                  </span>
                </div>
                <ChevronRight
                  className="h-4 w-4 text-amber-600 cursor-pointer hover:text-amber-800"
                  onClick={() => router.push(`${baseUrl}/equipos/listas`)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
