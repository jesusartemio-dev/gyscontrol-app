/**
 * 💰 Página de Aprovisionamiento Financiero
 * 
 * Vista principal del sistema de aprovisionamiento con:
 * - Gestión de proyectos con indicadores financieros
 * - Control de coherencia entre listas y pedidos
 * - KPIs y métricas de desempeño
 * - Timeline interactivo con Gantt
 * - Reportes y exportación
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import React, { Suspense, useState, useEffect, use, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { 
  BarChart3, 
  Calendar, 
  FileText, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Home
} from 'lucide-react'
import Link from 'next/link'

// ✅ Components
import { ProyectoAprovisionamientoTable } from '@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoTable'
import { ProyectoAprovisionamientoStats } from '@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoStats'
import { ProyectoAprovisionamientoFilters } from '@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoFilters'

// TooltipProvider removed - using global provider from layout

// 📡 Services
import { proyectosAprovisionamientoService } from '@/lib/services/aprovisionamiento'

// 🔧 Types
import type { FiltrosProyectoAprovisionamiento } from '@/types/aprovisionamiento'



interface PageProps {
  searchParams: Promise<{
    estado?: string
    comercial?: string
    fechaInicio?: string
    fechaFin?: string
    coherencia?: string
    page?: string
  }>
}

export default function AprovisionamientoPage({ searchParams }: PageProps) {
  // ✅ Framer-motion conflicts resolved
  
  // ✅ Unwrap searchParams usando React.use()
  const params = use(searchParams)
  
  const [proyectos, setProyectos] = useState<any[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  

  
  // 🔧 Memoize initial filters to prevent infinite re-renders
  const initialFiltros = useMemo<FiltrosProyectoAprovisionamiento>(() => ({
    estado: params.estado,
    clienteId: params.comercial,
    fechaInicio: params.fechaInicio && params.fechaFin ? {
      desde: params.fechaInicio,
      hasta: params.fechaFin
    } : undefined,
    page: parseInt(params.page || '1'),
    limit: 20
  }), [params.estado, params.comercial, params.fechaInicio, params.fechaFin, params.page])
  
  const [filtros, setFiltros] = useState<FiltrosProyectoAprovisionamiento>(initialFiltros)

  // 🔄 Sync filtros with URL params changes - only when params actually change
  const paramsRef = useRef(params)
  
  useEffect(() => {
    // Skip if params haven't actually changed (deep comparison)
    if (JSON.stringify(paramsRef.current) === JSON.stringify(params)) {
      return
    }
    
    paramsRef.current = params
    
    const newFiltros = {
      estado: params.estado,
      clienteId: params.comercial,
      fechaInicio: params.fechaInicio && params.fechaFin ? {
        desde: params.fechaInicio,
        hasta: params.fechaFin
      } : undefined,
      page: parseInt(params.page || '1'),
      limit: 20
    }
    
    setFiltros(newFiltros)
  }, [params])

  // 📡 Fetch data effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await proyectosAprovisionamientoService.obtenerProyectos(filtros)
        setProyectos(response.data || [])
        setPagination(response.pagination)
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filtros])

  // 🔁 Calculate summary stats
  const stats = {
    totalProyectos: pagination?.total || 0,
    proyectosActivos: proyectos.filter(p => p.estado === 'activo').length,
    alertasCoherencia: 0, // TODO: Implementar cuando se agregue lógica de coherencia
    montoTotal: proyectos.reduce((sum, p) => sum + (p.totalCliente || 0), 0)
  }

  // 🔄 Handle filter changes - Memoized to prevent infinite re-renders
  const handleFiltrosChange = useCallback((newFiltros: any) => {
    setFiltros(prev => {
      // Deep comparison to avoid unnecessary updates
      const merged = { ...prev, ...newFiltros }
      const hasChanged = JSON.stringify(prev) !== JSON.stringify(merged)
      return hasChanged ? merged : prev
    })
  }, [])

  return (
      <div className="container mx-auto py-6 space-y-6">
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finanzas">Finanzas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Aprovisionamiento</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 🎨 Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aprovisionamiento Financiero</h1>
            <p className="text-muted-foreground mt-2">
              Gestión integral de listas y pedidos de equipos con control de coherencia
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild>
              <Link href="/finanzas/aprovisionamiento/timeline">
                <Calendar className="h-4 w-4 mr-2" />
                Vista Timeline
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/finanzas/aprovisionamiento/reportes">
                <FileText className="h-4 w-4 mr-2" />
                Reportes
              </Link>
            </Button>
          </div>
        </div>

        {/* 📊 Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proyectos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProyectos}</div>
              <p className="text-xs text-muted-foreground">
                {stats.proyectosActivos} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.montoTotal.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                En listas aprobadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coherencia</CardTitle>
              {stats.alertasCoherencia > 0 ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.alertasCoherencia > 0 ? (
                  <Badge variant="destructive">{stats.alertasCoherencia} alertas</Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600">OK</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Listas vs Pedidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acciones Rápidas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/finanzas/aprovisionamiento/listas">
                  <Package className="h-3 w-3 mr-1" />
                  Listas
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/finanzas/aprovisionamiento/pedidos">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Pedidos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* 🎯 Main Content Tabs */}
      <Tabs defaultValue="proyectos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proyectos" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Vista Proyectos</span>
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Estadísticas</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Timeline</span>
          </TabsTrigger>
        </TabsList>

        {/* 📋 Projects Tab */}
        <TabsContent value="proyectos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros y Búsqueda</CardTitle>
              <CardDescription>
                Utiliza los filtros para encontrar proyectos específicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                <ProyectoAprovisionamientoFilters 
                  filtros={filtros}
                  onFiltrosChange={handleFiltrosChange}
                  loading={loading}
                />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proyectos de Aprovisionamiento</CardTitle>
              <CardDescription>
                Lista consolidada con indicadores de coherencia y KPIs financieros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <ProyectoAprovisionamientoTable 
                  proyectos={proyectos}
                  loading={loading}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📊 Statistics Tab */}
        <TabsContent value="estadisticas" className="space-y-6">
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
            <ProyectoAprovisionamientoStats 
              variant="detailed"
              proyectos={proyectos}
            />
          </Suspense>
        </TabsContent>

        {/* 📅 Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vista Timeline</CardTitle>
              <CardDescription>
                Visualización temporal del aprovisionamiento con Gantt interactivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Timeline Interactivo</h3>
                <p className="text-muted-foreground mb-4">
                  Accede a la vista completa del timeline con Gantt interactivo
                </p>
                <Button asChild>
                  <Link href="/finanzas/aprovisionamiento/timeline">
                    Abrir Timeline Completo
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
  )
}

// 🔄 Loading Component
function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
      
      <div className="h-96 bg-muted animate-pulse rounded" />
    </div>
  )
}

// ❌ Error Component
function Error({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }
  reset: () => void 
}) {
  return (
    <div className="container mx-auto p-6">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Error en Aprovisionamiento
          </CardTitle>
          <CardDescription>
            Ha ocurrido un error al cargar los datos de aprovisionamiento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || 'Error desconocido'}
          </p>
          <div className="flex space-x-2">
            <Button onClick={reset}>
              Reintentar
            </Button>
            <Button variant="outline" asChild>
              <Link href="/finanzas">
                Volver a Finanzas
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
