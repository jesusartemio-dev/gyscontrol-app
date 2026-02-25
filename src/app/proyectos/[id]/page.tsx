'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package,
  Wrench,
  Receipt,
  Calendar,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Truck,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  CheckCircle,
  FileWarning,
  Banknote,
  Pencil,
  Save,
  X,
  Loader2,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'

import { useProyectoContext } from './ProyectoContext'
import SeccionContrato from '@/components/proyectos/SeccionContrato'

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

type ProyectoCondExcl = {
  condiciones: { id: string; descripcion: string; tipo?: string | null; orden?: number | null }[]
  exclusiones: { id: string; descripcion: string; orden?: number | null }[]
}

export default function ProyectoHubPage() {
  const router = useRouter()
  const { proyecto, cronogramaStats, costosReales, setProyecto } = useProyectoContext()
  const [condExcl, setCondExcl] = useState<ProyectoCondExcl | null>(null)
  const [showCondExcl, setShowCondExcl] = useState(false)

  // Adelanto editing state
  const [editingAdelanto, setEditingAdelanto] = useState(false)
  const [savingAdelanto, setSavingAdelanto] = useState(false)
  const [editAdelantoPct, setEditAdelantoPct] = useState('0')
  const [editAdelantoMonto, setEditAdelantoMonto] = useState('0')

  const startEditingAdelanto = () => {
    if (!proyecto) return
    setEditAdelantoPct((proyecto.adelantoPorcentaje ?? 0).toString())
    setEditAdelantoMonto((proyecto.adelantoMonto ?? 0).toString())
    setEditingAdelanto(true)
  }

  const handleAdelantoPctChange = (val: string) => {
    setEditAdelantoPct(val)
    const pct = parseFloat(val) || 0
    const totalCliente = proyecto?.totalCliente || proyecto?.grandTotal || 0
    setEditAdelantoMonto((Math.round(totalCliente * (pct / 100) * 100) / 100).toString())
  }

  const handleAdelantoMontoChange = (val: string) => {
    setEditAdelantoMonto(val)
    const monto = parseFloat(val) || 0
    const totalCliente = proyecto?.totalCliente || proyecto?.grandTotal || 0
    if (totalCliente > 0) {
      setEditAdelantoPct((Math.round((monto / totalCliente) * 100 * 100) / 100).toString())
    }
  }

  const saveAdelanto = async () => {
    if (!proyecto) return
    setSavingAdelanto(true)
    try {
      const res = await fetch(`/api/proyecto/${proyecto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adelantoPorcentaje: parseFloat(editAdelantoPct) || 0,
          adelantoMonto: parseFloat(editAdelantoMonto) || 0,
        }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      const updated = await res.json()
      setProyecto({
        ...proyecto,
        adelantoPorcentaje: updated.adelantoPorcentaje,
        adelantoMonto: updated.adelantoMonto,
      })
      setEditingAdelanto(false)
      toast.success('Adelanto actualizado')
    } catch {
      toast.error('Error al guardar adelanto')
    } finally {
      setSavingAdelanto(false)
    }
  }

  useEffect(() => {
    if (!proyecto?.id) return
    fetch(`/api/proyectos/${proyecto.id}/condiciones-exclusiones`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCondExcl(data) })
      .catch(() => {})
  }, [proyecto?.id])

  if (!proyecto) return null

  const totalCond = condExcl?.condiciones?.length || 0
  const totalExcl = condExcl?.exclusiones?.length || 0

  // Calculate statistics
  const totalEquipos = proyecto.equipos?.length || 0
  const totalEquiposItems = proyecto.equipos?.reduce((acc, e) => acc + (e.items?.length || 0), 0) || 0
  const totalEquiposInterno = proyecto.equipos?.reduce((acc, e) => acc + (e.subtotalInterno || 0), 0) || 0
  const totalEquiposReal = proyecto.equipos?.reduce((acc, e) => acc + (e.subtotalReal || 0), 0) || 0
  // Cobertura: ítems cotizados ya vinculados a listas (en_lista, reemplazado, descartado)
  const equiposItemsEnLista = proyecto.equipos?.reduce((acc, e) =>
    acc + (e.items?.filter((i: any) => i.estado && i.estado !== 'pendiente').length || 0), 0) || 0
  const progresoCobertura = totalEquiposItems > 0
    ? { porcentaje: (equiposItemsEnLista / totalEquiposItems) * 100, estado: 'ok' as const }
    : null
  const totalServicios = proyecto.servicios?.length || 0
  const totalServiciosItems = proyecto.servicios?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0
  const totalServiciosInterno = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalInterno || 0), 0) || 0
  const totalServiciosReal = proyecto.servicios?.reduce((acc, s) => acc + (s.subtotalReal || 0), 0) || 0
  const totalGastos = proyecto.gastos?.length || 0
  const totalGastosItems = proyecto.gastos?.reduce((acc, g) => acc + (g.items?.length || 0), 0) || 0
  const totalGastosInterno = proyecto.gastos?.reduce((acc, g) => acc + (g.subtotalInterno || 0), 0) || 0
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

  // Calculate progress using transactional real costs (from OC, horas, gastos)
  const progresoEquiposEjec = costosReales.loading ? null : calcularProgreso(costosReales.equipos, totalEquiposInterno)
  const progresoServiciosEjec = costosReales.loading ? null : calcularProgreso(costosReales.servicios, totalServiciosInterno)
  const progresoGastosEjec = costosReales.loading ? null : calcularProgreso(costosReales.gastos, totalGastosInterno)

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
      total: totalEquiposInterno,
      progreso: progresoEquiposEjec,
      real: costosReales.equipos,
      plan: totalEquiposInterno,
      realLabel: costosReales.loading ? 'Cargando...' : `Ejec: ${formatCurrency(costosReales.equipos)}`,
      cotizado: totalEquiposReal,
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
      total: totalServiciosInterno,
      progreso: progresoServiciosEjec,
      real: costosReales.servicios,
      plan: totalServiciosInterno,
      realLabel: costosReales.loading ? 'Cargando...' : `Ejec: ${formatCurrency(costosReales.servicios)}`,
      cotizado: totalServiciosReal
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
      total: totalGastosInterno,
      progreso: progresoGastosEjec,
      real: costosReales.gastos,
      plan: totalGastosInterno,
      realLabel: costosReales.loading ? 'Cargando...' : `Ejec: ${formatCurrency(costosReales.gastos)}`,
      cotizado: totalGastosReal
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
      total: cronogramaStats.costoPlanificado,
      progreso: progresoHoras,
      real: cronogramaStats.horasReales,
      plan: cronogramaStats.horasPlan,
      realLabel: `${Math.round(cronogramaStats.horasReales)}h / ${Math.round(cronogramaStats.horasPlan)}h`,
      cobertura: cronogramaStats.tareas > 0
        ? { porcentaje: (cronogramaStats.tareasConRecurso / cronogramaStats.tareas) * 100, estado: 'ok' as const }
        : undefined,
      coberturaLabel: `Recursos ${cronogramaStats.tareasConRecurso}/${cronogramaStats.tareas}`,
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
      href: `${baseUrl}/tareas`,
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
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {card.badge}
                    </span>
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

                {/* Secondary: cotizado real (from supply lists / service items) */}
                {card.cotizado !== undefined && card.cotizado > 0 && (
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Cotizado:</span>
                    <span className="font-medium">{formatCurrency(card.cotizado)}</span>
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

      {/* Adelanto del Cliente */}
      {((proyecto.adelantoMonto ?? 0) > 0 || editingAdelanto) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold">Adelanto del Cliente</span>
                </div>
                {!editingAdelanto ? (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEditingAdelanto}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-green-700" onClick={saveAdelanto} disabled={savingAdelanto}>
                      {savingAdelanto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingAdelanto(false)} disabled={savingAdelanto}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {editingAdelanto ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Porcentaje (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editAdelantoPct}
                      onChange={e => handleAdelantoPctChange(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Monto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAdelantoMonto}
                      onChange={e => handleAdelantoMontoChange(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Porcentaje</div>
                      <div className="font-semibold">{(proyecto.adelantoPorcentaje ?? 0).toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Monto Total</div>
                      <div className="font-semibold">{formatCurrency(proyecto.adelantoMonto ?? 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Amortizado</div>
                      <div className="font-semibold text-orange-600">{formatCurrency(proyecto.adelantoAmortizado ?? 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Saldo</div>
                      <div className="font-semibold text-emerald-600">
                        {formatCurrency((proyecto.adelantoMonto ?? 0) - (proyecto.adelantoAmortizado ?? 0))}
                      </div>
                    </div>
                  </div>
                  {(proyecto.adelantoMonto ?? 0) > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progreso de amortización</span>
                        <span className="font-medium">
                          {((proyecto.adelantoMonto ?? 0) > 0
                            ? ((proyecto.adelantoAmortizado ?? 0) / (proyecto.adelantoMonto ?? 1) * 100).toFixed(1)
                            : '0'
                          )}%
                        </span>
                      </div>
                      <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${Math.min(
                              ((proyecto.adelantoAmortizado ?? 0) / Math.max(proyecto.adelantoMonto ?? 1, 1)) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Botón para configurar adelanto si no está configurado */}
      {!editingAdelanto && (proyecto.adelantoMonto ?? 0) === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={startEditingAdelanto}
          >
            <Banknote className="h-3.5 w-3.5 mr-1" />
            Configurar adelanto del cliente
          </Button>
        </motion.div>
      )}

      {/* Contrato y Cartas Fianza */}
      <SeccionContrato
        proyecto={proyecto}
        onUpdateProyecto={(updated: Partial<typeof proyecto>) => setProyecto({ ...proyecto, ...updated })}
      />

      {/* Condiciones y Exclusiones del Proyecto */}
      {(totalCond > 0 || totalExcl > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.35 }}
        >
          <Card>
            <CardContent className="p-0">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                onClick={() => setShowCondExcl(!showCondExcl)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">Condiciones</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{totalCond}</Badge>
                  </div>
                  <span className="text-muted-foreground">·</span>
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Exclusiones</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{totalExcl}</Badge>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCondExcl ? 'rotate-180' : ''}`} />
              </button>
              {showCondExcl && (
                <div className="border-t px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {totalCond > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Condiciones</h4>
                      <ul className="space-y-1.5">
                        {condExcl!.condiciones.map((c, i) => (
                          <li key={c.id} className="flex items-start gap-2 text-sm">
                            <span className="text-emerald-500 font-medium shrink-0">{i + 1}.</span>
                            <span className="text-gray-700">{c.descripcion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {totalExcl > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Exclusiones</h4>
                      <ul className="space-y-1.5">
                        {condExcl!.exclusiones.map((e, i) => (
                          <li key={e.id} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-500 font-medium shrink-0">{i + 1}.</span>
                            <span className="text-gray-700">{e.descripcion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

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
