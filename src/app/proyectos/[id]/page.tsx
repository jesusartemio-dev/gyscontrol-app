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
import type { Proyecto } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Package,
  Settings,
  Receipt,
  DollarSign,
  TrendingUp,
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
  Calendar,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

export default function ProyectoDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getProyectoById(id as string)
      .then((data) => {
        if (!data) {
          toast.error('❌ No se encontró el proyecto')
          return
        }
        setProyecto(data)
      })
      .catch(() => toast.error('❌ Error al obtener el proyecto'))
      .finally(() => setLoading(false))
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

  const getNextAction = (estado: string) => {
    const actions: Record<string, any> = {
      'creado': { text: 'Crear Listas', url: `/proyectos/${id}/listas`, icon: <Package className="h-4 w-4" /> },
      'listas_pendientes': { text: 'Aprobar Listas', url: `/proyectos/${id}/listas`, icon: <CheckCircle className="h-4 w-4" /> },
      'listas_aprobadas': { text: 'Crear Pedidos', url: `/proyectos/${id}/pedidos`, icon: <Truck className="h-4 w-4" /> },
      'pedidos_creados': { text: 'Monitorear', url: `/proyectos/${id}/cronograma`, icon: <Target className="h-4 w-4" /> },
      'en_ejecucion': { text: 'Ver Cronograma', url: `/proyectos/${id}/cronograma`, icon: <Calendar className="h-4 w-4" /> },
      'completado': { text: 'Finalizado', url: null, icon: <CheckCircle className="h-4 w-4" /> },
      'pausado': { text: 'Reanudar', url: null, icon: <PlayCircle className="h-4 w-4" /> },
      'cancelado': { text: 'Cancelado', url: null, icon: <XCircle className="h-4 w-4" /> }
    }
    return actions[estado] || actions.creado
  }

  // Legacy functions for backward compatibility
  const getStatusIcon = (estado: string) => getStatusInfo(estado).icon
  const getStatusVariant = (estado: string) => getStatusInfo(estado).variant

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Proyecto no encontrado</h2>
          <p className="text-gray-600">El proyecto que buscas no existe o ha sido eliminado.</p>
          <Button onClick={() => router.push('/proyectos')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Button>
        </motion.div>
      </div>
    )
  }

  // Calculate summary statistics
  const getSummaryStats = (proyecto: Proyecto) => {
    const equiposCount = proyecto.equipos?.length || 0
    const serviciosCount = proyecto.servicios?.length || 0
    const gastosCount = proyecto.gastos?.length || 0

    const equiposItems = proyecto.equipos?.reduce((sum, eq) => sum + (eq.items?.length || 0), 0) || 0
    const serviciosItems = proyecto.servicios?.reduce((sum, sv) => sum + (sv.items?.length || 0), 0) || 0
    const gastosItems = proyecto.gastos?.reduce((sum, ga) => sum + (ga.items?.length || 0), 0) || 0

    const totalItems = equiposItems + serviciosItems + gastosItems

    return {
      equipos: { count: equiposCount, items: equiposItems },
      servicios: { count: serviciosCount, items: serviciosItems },
      gastos: { count: gastosCount, items: gastosItems },
      totalItems,
      totalCost: proyecto.grandTotal || 0,
      daysElapsed: Math.round(((new Date().getTime() - new Date(proyecto.fechaInicio).getTime()) / (1000 * 60 * 60 * 24)))
    }
  }

  const stats = getSummaryStats(proyecto)

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
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
      </motion.div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Equipos Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href={`/proyectos/${id}/equipos`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-blue-200 hover:border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-6 w-6 text-blue-600" />
                    Equipos
                  </div>
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">Grupos</span>
                  <span className="text-2xl font-bold text-blue-900">{stats.equipos.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">Items Totales</span>
                  <span className="text-lg font-semibold text-blue-800">{stats.equipos.items}</span>
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-600">
                    Gestiona equipos técnicos, listas y pedidos del proyecto
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Servicios Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href={`/proyectos/${id}/servicios`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-purple-200 hover:border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Settings className="h-6 w-6 text-purple-600" />
                    Servicios
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
        </motion.div>

        {/* Gastos Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href={`/proyectos/${id}/gastos`}>
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-orange-200 hover:border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-6 w-6 text-orange-600" />
                    Gastos
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
        </motion.div>

        {/* Financial Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
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
        </motion.div>

        {/* Project Timeline Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => router.push(`/proyectos/${id}/cronograma`)}
          className="cursor-pointer"
        >
          <Card className="hover:shadow-lg transition-all duration-200 border-slate-200 hover:border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-slate-600" />
                  Cronograma
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 font-medium">EDTs Activos</span>
                <span className="text-2xl font-bold text-slate-900">
                  {(proyecto as any).edts?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 font-medium">Fases del Proyecto</span>
                <span className="text-lg font-semibold text-slate-800">
                  {(proyecto as any).fases?.length || 0}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-600">
                  Gestiona EDTs, fases y cronograma del proyecto
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
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
                  Gestionar Listas Técnicas
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
        </motion.div>
      </div>

      {/* Project Status Alert */}
      {proyecto.estado === 'creado' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
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
        </motion.div>
      )}
    </div>
  )
}
