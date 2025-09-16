// ===================================================
// 📁 Archivo: page.tsx (Detalles del Proyecto)
// 📌 Descripción: Página mejorada de detalles del proyecto con diseño moderno
// 📌 Características: Header mejorado, estadísticas visuales, navegación, timeline
// ✍️ Autor: Sistema de IA
// 📅 Actualizado: 2025-01-27
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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Building,
  User,
  Calendar,
  DollarSign,
  Package,
  Settings,
  Receipt,
  TrendingUp,
  Edit,
  Share2,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  PauseCircle
} from 'lucide-react'
import ProyectoEquipoAccordion from '@/components/proyectos/ProyectoEquipoAccordion'
import ProyectoServicioAccordion from '@/components/proyectos/ProyectoServicioAccordion'

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
  const getStatusIcon = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'activo':
        return <CheckCircle className="h-4 w-4" />
      case 'completado':
        return <CheckCircle className="h-4 w-4" />
      case 'pausado':
        return <PauseCircle className="h-4 w-4" />
      case 'cancelado':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusVariant = (estado: string): "default" | "outline" => {
    switch (estado.toLowerCase()) {
      case 'activo':
        return 'default'
      case 'completado':
        return 'default'
      case 'pausado':
        return 'outline'
      case 'cancelado':
        return 'outline'
      default:
        return 'outline'
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Project Title & Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/proyectos')}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Proyectos
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Badge variant={getStatusVariant(proyecto.estado)} className="flex items-center gap-1">
                  {getStatusIcon(proyecto.estado)}
                  {proyecto.estado.charAt(0).toUpperCase() + proyecto.estado.slice(1)}
                </Badge>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{proyecto.nombre}</h1>
                <p className="text-slate-600 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Código: <span className="font-mono font-medium">{proyecto.codigo}</span>
                </p>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>{proyecto.cliente?.nombre || 'Sin cliente'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{proyecto.comercial?.name || 'Sin comercial'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(proyecto.fechaInicio)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Project Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Project Information */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-slate-600" />
                  Información del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Building className="h-4 w-4" />
                        Cliente
                      </span>
                      <span className="text-sm text-slate-900 font-medium">
                        {proyecto.cliente?.nombre || '—'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <User className="h-4 w-4" />
                        Comercial
                      </span>
                      <span className="text-sm text-slate-900 font-medium">
                        {proyecto.comercial?.name || '—'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <User className="h-4 w-4" />
                        Gestor
                      </span>
                      <span className="text-sm text-slate-900 font-medium">
                        {proyecto.gestor?.name || '—'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Calendar className="h-4 w-4" />
                        Fecha de Inicio
                      </span>
                      <span className="text-sm text-slate-900 font-medium">
                        {formatDate(proyecto.fechaInicio)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <TrendingUp className="h-4 w-4" />
                        Estado
                      </span>
                      <Badge variant={getStatusVariant(proyecto.estado)} className="flex items-center gap-1">
                        {getStatusIcon(proyecto.estado)}
                        {proyecto.estado.charAt(0).toUpperCase() + proyecto.estado.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Receipt className="h-4 w-4" />
                        Descuento
                      </span>
                      <span className="text-sm text-slate-900 font-medium">
                        {proyecto.descuento}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Section */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-slate-600" />
                  Equipos Técnicos del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {proyecto.equipos && proyecto.equipos.length > 0 ? (
                  <div className="space-y-4">
                    {proyecto.equipos.map((equipo) => (
                      <ProyectoEquipoAccordion
                        key={equipo.id}
                        equipo={equipo}
                        onUpdatedItem={() => {
                          // Refresh project data
                          getProyectoById(id as string).then(setProyecto)
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium mb-2">No hay equipos registrados</p>
                    <p className="text-sm">Los equipos técnicos aparecerán aquí una vez que sean agregados al proyecto.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services Section */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-slate-600" />
                  Servicios del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {proyecto.servicios && proyecto.servicios.length > 0 ? (
                  <div className="space-y-4">
                    {proyecto.servicios.map((servicio) => (
                      <ProyectoServicioAccordion
                        key={servicio.id}
                        servicio={servicio}
                        onUpdatedItem={() => {
                          // Refresh project data
                          getProyectoById(id as string).then(setProyecto)
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium mb-2">No hay servicios registrados</p>
                    <p className="text-sm">Los servicios aparecerán aquí una vez que sean agregados al proyecto.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Financial Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Financial Overview */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Resumen Financiero
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cost Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <Package className="h-4 w-4" />
                      Equipos
                    </span>
                    <span className="text-sm font-bold text-blue-900">
                      {formatCurrency(proyecto.totalEquiposInterno)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="flex items-center gap-2 text-sm font-medium text-purple-700">
                      <Settings className="h-4 w-4" />
                      Servicios
                    </span>
                    <span className="text-sm font-bold text-purple-900">
                      {formatCurrency(proyecto.totalServiciosInterno)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <span className="flex items-center gap-2 text-sm font-medium text-orange-700">
                      <Receipt className="h-4 w-4" />
                      Gastos
                    </span>
                    <span className="text-sm font-bold text-orange-900">
                      {formatCurrency(proyecto.totalGastosInterno)}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <DollarSign className="h-4 w-4" />
                      Total Cliente
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(proyecto.totalCliente)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <span className="flex items-center gap-2 font-semibold text-green-700">
                      <TrendingUp className="h-5 w-5" />
                      Gran Total
                    </span>
                    <span className="text-lg font-bold text-green-800">
                      {formatCurrency(proyecto.grandTotal)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-slate-600" />
                  Estadísticas Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {proyecto.equipos?.length || 0}
                    </div>
                    <div className="text-xs text-blue-700 font-medium">Equipos</div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {proyecto.servicios?.length || 0}
                    </div>
                    <div className="text-xs text-purple-700 font-medium">Servicios</div>
                  </div>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {(proyecto.equipos?.reduce((acc, eq) => acc + (eq.items?.length || 0), 0) || 0) + 
                     (proyecto.servicios?.reduce((acc, sv) => acc + (sv.items?.length || 0), 0) || 0)}
                  </div>
                  <div className="text-xs text-green-700 font-medium">Total Items</div>
                </div>
                
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold text-slate-600">
                    {Math.round(((new Date().getTime() - new Date(proyecto.fechaInicio).getTime()) / (1000 * 60 * 60 * 24)))}
                  </div>
                  <div className="text-xs text-slate-700 font-medium">Días transcurridos</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
