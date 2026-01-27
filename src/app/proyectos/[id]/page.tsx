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
  TrendingDown
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

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
  const totalEquiposReal = proyecto.equipos?.reduce((acc, e) => acc + (e.subtotalReal || 0), 0) || 0
  const totalServicios = proyecto.servicios?.length || 0
  const totalServiciosItems = proyecto.servicios?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0
  const totalServiciosCliente = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalCliente || 0), 0) || 0
  const totalServiciosReal = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalReal || 0), 0) || 0
  const totalGastos = proyecto.gastos?.length || 0
  const totalGastosItems = proyecto.gastos?.reduce((acc, g) => acc + (g.items?.length || 0), 0) || 0
  const totalGastosCliente = proyecto.gastos?.reduce((acc, g) => acc + (g.subtotalCliente || 0), 0) || 0
  const totalGastosReal = proyecto.gastos?.reduce((acc, g) => acc + (g.subtotalReal || 0), 0) || 0
  const totalListas = proyecto.ListaEquipo?.length || 0
  const totalPedidos = (proyecto as any).pedidos?.length || 0

  // Calculate progress for each category
  const progresoEquipos = calcularProgreso(totalEquiposReal, totalEquiposCliente)
  const progresoServicios = calcularProgreso(totalServiciosReal, totalServiciosCliente)
  const progresoGastos = calcularProgreso(totalGastosReal, totalGastosCliente)

  const baseUrl = `/proyectos/${proyecto.id}`

  const navigationCards = [
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
      ],
      total: totalEquiposCliente,
      progreso: progresoEquipos,
      real: totalEquiposReal,
      plan: totalEquiposCliente
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
    {
      id: 'cronograma',
      title: 'Cronograma',
      description: 'Fases, EDTs, actividades y tareas',
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      hoverBg: 'hover:bg-purple-50',
      borderColor: 'border-purple-200',
      href: `${baseUrl}/cronograma`,
      stats: [
        { label: 'EDTs', value: cronogramaStats.edts },
        { label: 'Tareas', value: cronogramaStats.tareas },
      ],
      badge: cronogramaStats.activeCronograma?.nombre || 'Cronograma'
    },
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
      ],
    },
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
      ],
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
  ]

  return (
    <div className="space-y-6">
      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navigationCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="h-full"
          >
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${card.hoverBg} group border-l-4 ${card.borderColor} h-full flex flex-col`}
              onClick={() => router.push(card.href)}
            >
              <CardHeader className="pb-2 flex-1">
                <div className="flex items-center justify-between min-h-[40px]">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  {card.badge && (
                    <Badge variant="outline" className="text-xs">
                      {card.badge}
                    </Badge>
                  )}
                  {card.total !== undefined && card.total > 0 && (
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency(card.total)}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg group-hover:text-primary flex items-center justify-between mt-2">
                  {card.title}
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="flex items-center gap-4 text-sm min-h-[24px]">
                  {card.stats && card.stats.length > 0 ? (
                    card.stats.map((stat, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900">{stat.value}</span>
                        <span className="text-muted-foreground">{stat.label}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs">Ver detalles</span>
                  )}
                </div>

                {/* Progress bar for cost tracking */}
                {card.progreso && card.plan && card.plan > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {card.progreso.estado === 'danger' ? (
                          <TrendingUp className="h-3 w-3 text-red-500" />
                        ) : card.progreso.estado === 'warning' ? (
                          <TrendingUp className="h-3 w-3 text-amber-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-emerald-500" />
                        )}
                        Real: {formatCurrency(card.real || 0)}
                      </span>
                      <span className={`font-medium ${
                        card.progreso.estado === 'danger' ? 'text-red-600' :
                        card.progreso.estado === 'warning' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {card.progreso.porcentaje.toFixed(0)}%
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Status Alert for new projects */}
      {proyecto.estado === 'creado' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">Proyecto recién creado</h3>
                  <p className="text-amber-700 text-sm">
                    Comienza creando listas técnicas para organizar los equipos del proyecto.
                  </p>
                </div>
                <ChevronRight
                  className="h-5 w-5 text-amber-600 cursor-pointer hover:text-amber-800"
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
