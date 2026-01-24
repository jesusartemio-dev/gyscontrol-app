// ===================================================
// 📁 Archivo: page.tsx (Resumen del Proyecto)
// 📌 Descripción: Dashboard de resumen del proyecto con navegación a secciones detalladas
// 🎨 Vista simplificada con cards interactivos para mejor UX
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-20
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import type { Proyecto, ProyectoCronograma } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Package,
  Settings,
  Receipt,
  DollarSign,
  Eye,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  XCircle,
  PauseCircle,
  Truck,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

export default function ProyectoDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [cronogramas, setCronogramas] = useState<ProyectoCronograma[]>([])
  const [cronogramaStats, setCronogramaStats] = useState({
    cronogramas: 0,
    fases: 0,
    edts: 0,
    tareas: 0,
    activeCronograma: null as any
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        // Fetch project data
        const proyectoData = await getProyectoById(id as string)
        if (!proyectoData) {
          toast.error('❌ No se encontró el proyecto')
          return
        }
        setProyecto(proyectoData)

        // Fetch cronograma data
        try {
          const cronogramaResponse = await fetch(`/api/proyectos/${id}/cronograma`)
          let cronogramasList: ProyectoCronograma[] = []

          if (cronogramaResponse.ok) {
            const cronogramaData = await cronogramaResponse.json()
            if (cronogramaData.success) {
              cronogramasList = cronogramaData.data
              setCronogramas(cronogramasList)
            }
          }

          // Fetch fases, edts, and tareas counts
          const [fasesResponse, edtsResponse, tareasResponse] = await Promise.all([
            fetch(`/api/proyectos/${id}/cronograma/fases`),
            fetch(`/api/proyectos/${id}/cronograma/edts`),
            fetch(`/api/proyectos/${id}/cronograma/tareas`)
          ])

          let fasesCount = 0
          let edtsCount = 0
          let tareasCount = 0

          if (fasesResponse.ok) {
            const fasesData = await fasesResponse.json()
            if (fasesData.success) {
              fasesCount = fasesData.data.length
            }
          }

          if (edtsResponse.ok) {
            const edtsData = await edtsResponse.json()
            if (edtsData.success) {
              edtsCount = edtsData.data.length
            }
          }

          if (tareasResponse.ok) {
            const tareasData = await tareasResponse.json()
            if (tareasData.success) {
              tareasCount = tareasData.data.length
            }
          }

          // ✅ Si no hay cronograma comercial, crear uno automáticamente con EDTs y actividades
          if (cronogramasList.length === 0) {
            console.log('🔄 [PROYECTO PAGE] No hay cronogramas, creando cronograma comercial por defecto')
            try {
              const createResponse = await fetch(`/api/proyectos/${id}/cronograma/generar-desde-cotizacion`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  tipo: 'comercial',
                  nombre: 'Cronograma Comercial',
                  esBaseline: false
                })
              })

              if (createResponse.ok) {
                const newCronograma = await createResponse.json()
                console.log('✅ [PROYECTO PAGE] Cronograma comercial creado con EDTs y actividades:', newCronograma.data)
                // Recargar cronogramas
                const updatedCronogramaResponse = await fetch(`/api/proyectos/${id}/cronograma`)
                if (updatedCronogramaResponse.ok) {
                  const updatedData = await updatedCronogramaResponse.json()
                  if (updatedData.success) {
                    cronogramasList = updatedData.data
                    setCronogramas(cronogramasList)
                  }
                }
              } else {
                console.warn('⚠️ [PROYECTO PAGE] Error creando cronograma comercial por defecto')
              }
            } catch (createError) {
              console.warn('⚠️ [PROYECTO PAGE] Error creando cronograma comercial:', createError)
            }
          }

          // Find active/baseline cronograma
          const activeCronograma = cronogramasList.find(c => c.esBaseline) || cronogramasList[0] || null

          setCronogramaStats({
            cronogramas: cronogramasList.length,
            fases: fasesCount,
            edts: edtsCount,
            tareas: tareasCount,
            activeCronograma
          })
        } catch (cronogramaError) {
          console.warn('Error fetching cronograma data:', cronogramaError)
          // Don't show error for cronograma, just continue without it
        }
      } catch (error) {
        toast.error('❌ Error al obtener el proyecto')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // Helper functions
  const getStatusInfo = (estado: string) => {
    const statusMap: Record<string, any> = {
      'creado': {
        icon: <Clock className="h-4 w-4" />,
        variant: 'outline' as const,
        color: 'bg-blue-100 text-blue-800',
        label: 'Creado',
        description: 'Proyecto recién creado desde cotización'
      },
      'listas_pendientes': {
        icon: <AlertTriangle className="h-4 w-4" />,
        variant: 'outline' as const,
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Listas Pendientes',
        description: 'Esperando creación/aprobación de listas'
      },
      'listas_aprobadas': {
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'default' as const,
        color: 'bg-green-100 text-green-800',
        label: 'Listo para Pedidos',
        description: 'Listas aprobadas, puede crear pedidos'
      },
      'pedidos_creados': {
        icon: <Truck className="h-4 w-4" />,
        variant: 'default' as const,
        color: 'bg-purple-100 text-purple-800',
        label: 'En Ejecución',
        description: 'Pedidos parciales creados'
      },
      'en_ejecucion': {
        icon: <PlayCircle className="h-4 w-4" />,
        variant: 'default' as const,
        color: 'bg-blue-100 text-blue-800',
        label: 'En Ejecución',
        description: 'Proyecto en ejecución activa'
      },
      'completado': {
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'default' as const,
        color: 'bg-green-100 text-green-800',
        label: 'Completado',
        description: 'Proyecto terminado exitosamente'
      },
      'pausado': {
        icon: <PauseCircle className="h-4 w-4" />,
        variant: 'outline' as const,
        color: 'bg-orange-100 text-orange-800',
        label: 'Pausado',
        description: 'Proyecto temporalmente pausado'
      },
      'cancelado': {
        icon: <XCircle className="h-4 w-4" />,
        variant: 'outline' as const,
        color: 'bg-red-100 text-red-800',
        label: 'Cancelado',
        description: 'Proyecto cancelado'
      }
    }
    return statusMap[estado] || statusMap.creado
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" data-testid="loading-skeleton">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 col-span-2 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (!proyecto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Proyecto no encontrado</h2>
          <p className="text-gray-600">El proyecto que buscas no existe o ha sido eliminado.</p>
          <Button onClick={() => router.push('/proyectos')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Button>
        </div>
      </div>
    )
  }

  // Calculate summary statistics
  const getSummaryStats = (proyecto: Proyecto) => {
    const equiposCount = proyecto.equipos?.length || 0
    const serviciosCount = proyecto.servicios?.length || 0
    const gastosCount = proyecto.gastos?.length || 0
    const listasCount = (proyecto as any).listaEquipos?.length || 0
    const pedidosCount = (proyecto as any).pedidos?.length || 0

    const equiposItems = proyecto.equipos?.reduce((sum, eq) => sum + (eq.items?.length || 0), 0) || 0

    // Calculate total quantities in equipos
    const equiposCantidades = proyecto.equipos?.reduce((sum: number, eq: any) =>
      sum + (eq.items?.reduce((itemSum: number, item: any) => itemSum + (item.cantidad || 0), 0) || 0), 0) || 0
    const serviciosItems = proyecto.servicios?.reduce((sum, sv) => sum + (sv.items?.length || 0), 0) || 0
    const gastosItems = proyecto.gastos?.reduce((sum, ga) => sum + (ga.items?.length || 0), 0) || 0

    // For listas items, we need to count items in each lista
    const listasItems = (proyecto as any).listaEquipos?.reduce((sum: number, lista: any) => sum + (lista.items?.length || 0), 0) || 0

    // Calculate total quantities in listas
    const listasCantidades = (proyecto as any).listaEquipos?.reduce((sum: number, lista: any) =>
      sum + (lista.items?.reduce((itemSum: number, item: any) => itemSum + (item.cantidad || 0), 0) || 0), 0) || 0

    // For pedidos items, we need to count items in each pedido
    const pedidosItems = (proyecto as any).pedidos?.reduce((sum: number, pedido: any) => sum + (pedido.items?.length || 0), 0) || 0

    // Calculate total quantities ordered in pedidos
    const pedidosCantidades = (proyecto as any).pedidos?.reduce((sum: number, pedido: any) =>
      sum + (pedido.items?.reduce((itemSum: number, item: any) => itemSum + (item.cantidadPedida || 0), 0) || 0), 0) || 0

    // Calculate cronograma statistics from nested cronogramas
    const cronogramas = (proyecto as any).cronogramas || []
    const baselineCronograma = cronogramas.find((c: any) => c.esBaseline) || cronogramas[0]

    let edtsCount = 0
    let fasesCount = 0

    if (baselineCronograma) {
      edtsCount = baselineCronograma.edts?.length || 0
      fasesCount = baselineCronograma.fases?.length || 0
    }

    const totalItems = equiposItems + serviciosItems + gastosItems

    return {
      equipos: { count: equiposCount, items: equiposItems, cantidades: equiposCantidades },
      servicios: { count: serviciosCount, items: serviciosItems },
      gastos: { count: gastosCount, items: gastosItems },
      listas: { count: listasCount, items: listasItems, cantidades: listasCantidades },
      pedidos: { count: pedidosCount, items: pedidosItems, cantidades: pedidosCantidades },
      cronograma: { edts: edtsCount, fases: fasesCount },
      totalItems,
      totalCost: proyecto.grandTotal || 0,
      daysElapsed: Math.round(((new Date().getTime() - new Date(proyecto.fechaInicio).getTime()) / (1000 * 60 * 60 * 24)))
    }
  }

  const stats = getSummaryStats(proyecto)

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Eye className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Resumen del Proyecto</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Vista general del proyecto con acceso rápido a todas las secciones principales
        </p>
        <Badge className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium ${getStatusInfo(proyecto.estado).color}`}>
          {getStatusInfo(proyecto.estado).icon}
          {getStatusInfo(proyecto.estado).label}
        </Badge>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Equipos Card */}
        <div>
          <Link href={`/proyectos/${id}/equipos`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-blue-200 hover:border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-6 w-6 text-blue-600" />
                    Equipos Cotizados
                  </div>
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">Equipos</span>
                  <span className="text-2xl font-bold text-blue-900">{stats.equipos.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">Items Totales</span>
                  <span className="text-lg font-semibold text-blue-800">{stats.equipos.items}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">Cantidades Totales</span>
                  <span className="text-lg font-semibold text-blue-800">{stats.equipos.cantidades}</span>
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-600">
                    Gestiona equipos técnicos, listas y pedidos del proyecto
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Servicios Card */}
        <div>
          <Link href={`/proyectos/${id}/servicios`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-purple-200 hover:border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Settings className="h-6 w-6 text-purple-600" />
                    Servicios Cotizados
                  </div>
                  <ArrowRight className="h-5 w-5 text-purple-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-700 font-medium">Servicios</span>
                  <span className="text-2xl font-bold text-purple-900">{stats.servicios.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-700 font-medium">Items Totales</span>
                  <span className="text-lg font-semibold text-purple-800">{stats.servicios.items}</span>
                </div>
                <div className="pt-2 border-t border-purple-200">
                  <p className="text-xs text-purple-600">
                    Gestiona servicios, requerimientos y entregas del proyecto
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Gastos Card */}
        <div>
          <Link href={`/proyectos/${id}/gastos`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-orange-200 hover:border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-6 w-6 text-orange-600" />
                    Gastos Cotizados
                  </div>
                  <ArrowRight className="h-5 w-5 text-orange-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-700 font-medium">Categorías</span>
                  <span className="text-2xl font-bold text-orange-900">{stats.gastos.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-700 font-medium">Items Totales</span>
                  <span className="text-lg font-semibold text-orange-800">{stats.gastos.items}</span>
                </div>
                <div className="pt-2 border-t border-orange-200">
                  <p className="text-xs text-orange-600">
                    Gestiona gastos, presupuestos y control financiero del proyecto
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Financial Summary Card */}
        <div>
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-green-200 hover:border-green-300 bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  Resumen Financiero
                </div>
                <ArrowRight className="h-5 w-5 text-green-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700 font-medium">Total Items</span>
                <span className="text-2xl font-bold text-green-900">{stats.totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700 font-medium">Costo Total</span>
                <span className="text-lg font-semibold text-green-800">{formatCurrency(stats.totalCost)}</span>
              </div>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-green-600">
                  Vista completa del presupuesto y costos del proyecto
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Timeline Card */}
        <div>
          <Link href={`/proyectos/${id}/cronograma`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-slate-200 hover:border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-slate-600" />
                  Cronograma 5 Niveles
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cronogramaStats.activeCronograma && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-900">Cronograma Activo</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">{cronogramaStats.activeCronograma.nombre}</div>
                    <div className="text-xs text-blue-600 capitalize">
                      Tipo: {cronogramaStats.activeCronograma.tipo}
                      {cronogramaStats.activeCronograma.esBaseline && (
                        <Badge className="ml-2 bg-green-100 text-green-800 text-xs">Baseline</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">Cronogramas</span>
                  <span className="text-xl font-bold text-slate-900">
                    {cronogramaStats.cronogramas}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">Fases</span>
                  <span className="text-lg font-semibold text-slate-800">
                    {cronogramaStats.fases}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">EDTs</span>
                  <span className="text-lg font-semibold text-slate-800">
                    {cronogramaStats.edts}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">Tareas</span>
                  <span className="text-lg font-semibold text-slate-800">
                    {cronogramaStats.tareas}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-600">
                  Gestiona cronogramas, fases, EDTs, actividades y tareas del proyecto
                </p>
              </div>
            </CardContent>
          </Card>
          </Link>
        </div>

        {/* Listas Card */}
        <div>
          <Link href={`/proyectos/${id}/equipos/listas`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-emerald-200 hover:border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-6 w-6 text-emerald-600" />
                    Gestionar Listas
                  </div>
                  <ArrowRight className="h-5 w-5 text-emerald-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700 font-medium">Listas</span>
                  <span className="text-2xl font-bold text-emerald-900">{stats.listas.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700 font-medium">Items Totales</span>
                  <span className="text-lg font-semibold text-emerald-800">{stats.listas.items}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700 font-medium">Cantidades Totales</span>
                  <span className="text-lg font-semibold text-emerald-800">{stats.listas.cantidades}</span>
                </div>
                <div className="pt-2 border-t border-emerald-200">
                  <p className="text-xs text-emerald-600">
                    Gestiona listas técnicas y control de requerimientos
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pedidos Card */}
        <div>
          <Link href={`/proyectos/${id}/equipos/pedidos`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-cyan-200 hover:border-cyan-300 bg-gradient-to-br from-cyan-50 to-cyan-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Truck className="h-6 w-6 text-cyan-600" />
                    Gestionar Pedidos
                  </div>
                  <ArrowRight className="h-5 w-5 text-cyan-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cyan-700 font-medium">Pedidos</span>
                  <span className="text-2xl font-bold text-cyan-900">{stats.pedidos.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cyan-700 font-medium">Items Totales</span>
                  <span className="text-lg font-semibold text-cyan-800">{stats.pedidos.items}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cyan-700 font-medium">Cantidades Pedidas</span>
                  <span className="text-lg font-semibold text-cyan-800">{stats.pedidos.cantidades}</span>
                </div>
                <div className="pt-2 border-t border-cyan-200">
                  <p className="text-xs text-cyan-600">
                    Gestiona pedidos de compra y seguimiento logístico
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions Card */}
        <div>
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-indigo-200 hover:border-indigo-300 bg-gradient-to-br from-indigo-50 to-indigo-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                  Acciones Rápidas
                </div>
                <ArrowRight className="h-5 w-5 text-indigo-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-indigo-700 border-indigo-200 hover:bg-indigo-200"
                  onClick={() => router.push(`/proyectos/${id}/equipos/listas`)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Gestionar Listas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-indigo-700 border-indigo-200 hover:bg-indigo-200"
                  onClick={() => router.push(`/proyectos/${id}/equipos/pedidos`)}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Gestionar Pedidos
                </Button>
              </div>
              <div className="pt-2 border-t border-indigo-200">
                <p className="text-xs text-indigo-600">
                  Accede rápidamente a las funciones más utilizadas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Status Alert */}
      {proyecto.estado === 'creado' && (
        <div>
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">¡Comienza tu proyecto!</h3>
                  <p className="text-amber-700 text-sm mb-3">
                    Es hora de crear las primeras listas técnicas para organizar los equipos del proyecto.
                  </p>
                  <Button
                    onClick={() => router.push(`/proyectos/${id}/equipos`)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Ir a Equipos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
