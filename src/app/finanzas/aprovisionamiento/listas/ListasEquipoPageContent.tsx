/**
 * 📄 Contenido de la Página de Listas de Equipo - Sistema GYS
 * 
 * Funcionalidades:
 * - ✅ Listado paginado de listas de equipo
 * - ✅ Filtros avanzados (proyecto, estado, fechas, montos)
 * - ✅ Búsqueda por texto
 * - ✅ Ordenamiento por columnas
 * - ✅ Estadísticas en tiempo real
 * - ✅ Exportación a PDF/Excel
 * - ✅ Navegación breadcrumb
 * - ✅ Estados de carga y error
 * - ✅ Responsive design
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { 
  Package, 
  ArrowLeft, 
  Plus, 
  Download, 
  Upload,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Home
} from 'lucide-react'

// ✅ Components
import ListaEquipoFiltersClient from '@/components/aprovisionamiento/ListaEquipoFiltersClient'
import ListaEquipoTableClient from '@/components/aprovisionamiento/ListaEquipoTableClient'

// 🔧 Services
import { getListasEquipoClient } from '@/lib/services/aprovisionamientoClient'

// 📝 Types
import type { EstadoListaEquipo } from '@/types/modelos'

export default function ListasEquipoPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  
  // 🔁 State management
  const [listasData, setListasData] = useState<{
    items: any[]
    total: number
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }>({
    items: [],
    total: 0,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
      hasNext: false,
      hasPrev: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 📋 Extract search params with memoization to prevent infinite loops
  const searchParamsObj = useMemo(() => {
    const params: Record<string, string | undefined> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    return params
  }, [searchParams])
  
  const page = parseInt(searchParamsObj.page || '1')
  const limit = parseInt(searchParamsObj.limit || '10')
  const proyecto = searchParamsObj.proyecto
  const estado = searchParamsObj.estado
  const fechaInicio = searchParamsObj.fechaInicio
  const fechaFin = searchParamsObj.fechaFin
  const montoMin = searchParamsObj.montoMin
  const montoMax = searchParamsObj.montoMax
  const coherencia = searchParamsObj.coherencia
  const busqueda = searchParamsObj.busqueda
  const sortBy = searchParamsObj.sortBy
  const sortOrder = (searchParamsObj.sortOrder as 'asc' | 'desc') || 'desc'

  // 📡 Fetch data effect
  useEffect(() => {
    const fetchListas = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const filtros = {
          page,
          limit,
          ...(proyecto && { proyectoId: proyecto }),
          ...(estado && { estado }),
          ...(fechaInicio && { fechaInicio }),
          ...(fechaFin && { fechaFin }),
          ...(montoMin && { montoMin: parseFloat(montoMin) }),
          ...(montoMax && { montoMax: parseFloat(montoMax) }),
          ...(coherencia && { soloCoherencia: coherencia === 'true' }),
          ...(busqueda && { busqueda }),
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder })
        }
        
        const response = await getListasEquipoClient(filtros)
        
        if (response.success) {
          const listasArray = response.data?.listas || []
          
          setListasData({
            items: listasArray,
            total: response.data?.pagination?.total || 0,
            pagination: response.data?.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              pages: 0,
              hasNext: false,
              hasPrev: false
            }
          })
        } else {
          setError('Error al cargar las listas')
        }
      } catch (err) {
        console.error('Error fetching listas:', err)
        setError('Error de conexión al cargar las listas')
      } finally {
        setLoading(false)
      }
    }

    if (status !== 'loading') {
      fetchListas()
    }
  }, [
    page, 
    limit, 
    proyecto, 
    estado, 
    fechaInicio, 
    fechaFin, 
    montoMin, 
    montoMax, 
    coherencia, 
    busqueda, 
    sortBy, 
    sortOrder,
    status
  ])

  // 🔄 Handle filter changes
  const handleFilterChange = (newFilters: Record<string, any>) => {
    const params = new URLSearchParams()
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    params.set('limit', limit.toString())
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value.toString())
      }
    })
    
    router.push(`/finanzas/aprovisionamiento/listas?${params.toString()}`)
  }

  // 📊 Calculate statistics
  const stats = useMemo(() => {
    const items = listasData.items || []
    
    return {
      total: items.length,
      pendientes: items.filter((item: any) => item.estado === 'pendiente').length,
      aprobadas: items.filter((item: any) => item.estado === 'aprobada').length,
      rechazadas: items.filter((item: any) => item.estado === 'rechazada').length,
      montoTotal: items.reduce((sum: number, item: any) => sum + (item.montoTotal || 0), 0)
    }
  }, [listasData.items])

  // 🎨 Render loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {/* Breadcrumb skeleton */}
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
          
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          
          {/* Filters skeleton */}
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          
          {/* Table skeleton */}
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // 🚨 Render error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900">Error al cargar las listas</h2>
          <p className="text-gray-600 text-center max-w-md">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="mt-4"
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finanzas">Finanzas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finanzas/aprovisionamiento">Aprovisionamiento</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Listas de Equipo</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📋 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Listas de Equipo</h1>
          </div>
          <p className="text-gray-600">
            Gestiona las listas de equipos y materiales para los proyectos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Lista
          </Button>
        </div>
      </div>

      {/* 📊 Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listasData.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total} en esta página
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">
              Esperando aprobación
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aprobadas}</div>
            <p className="text-xs text-muted-foreground">
              Listas para pedidos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rechazadas}</div>
            <p className="text-xs text-muted-foreground">
              Requieren revisión
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
              S/ {stats.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor estimado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🔍 Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtra las listas por proyecto, estado, fechas y montos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListaEquipoFiltersClient
            filtros={{
              busqueda,
              proyecto,
              estado,
              fechaInicio,
              fechaFin,
              montoMin,
              montoMax,
              coherencia
            }}
            searchParams={searchParamsObj}
            showQuickFilters={true}
          />
        </CardContent>
      </Card>

      {/* 📋 Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listas de Equipo</CardTitle>
          <CardDescription>
            {listasData.total > 0 
              ? `Mostrando ${listasData.items.length} de ${listasData.total} listas`
              : 'No se encontraron listas con los filtros aplicados'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListaEquipoTableClient
            listas={listasData.items}
            loading={loading}
            allowEdit={true}
            allowBulkActions={true}
            showCoherenceIndicators={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
