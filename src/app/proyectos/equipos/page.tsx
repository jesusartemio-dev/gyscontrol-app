/**
 * 🎯 Página de Equipos de Proyectos
 * 
 * Vista consolidada de todos los equipos de proyectos con:
 * - Estadísticas en tiempo real
 * - Filtros avanzados
 * - Tabla interactiva
 * - Navegación consistente
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { Package, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

// 🎨 UI Components
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// 📡 Services
import { getProyectoEquipoItems } from '@/lib/services/proyectoEquipoItem'
import { getProyectos } from '@/lib/services/proyecto'

// 🧩 Components
import { EquiposTableWrapper } from '@/components/proyectos/EquiposTableWrapper'
import { EquiposFiltersWrapper } from '@/components/proyectos/EquiposFiltersWrapper'

export const metadata: Metadata = {
  title: 'Equipos - Proyectos | GYS',
  description: 'Gestión de equipos de todos los proyectos'
}

interface PageProps {
  searchParams: Promise<{
    proyectoId?: string
    estado?: string
    categoria?: string
    busqueda?: string
    page?: string
    limit?: string
  }>
}

// 📊 Función para obtener equipos de todos los proyectos
async function getEquiposData(searchParams: Awaited<PageProps['searchParams']>) {
  try {
    const proyectos = await getProyectos()
    let todosLosEquipos: any[] = []
    
    // Si hay filtro por proyecto específico
    if (searchParams.proyectoId && searchParams.proyectoId !== 'todos') {
      const equipos = await getProyectoEquipoItems(searchParams.proyectoId)
      todosLosEquipos = equipos.map(equipo => ({
        ...equipo,
        proyecto: proyectos.find(p => p.id === searchParams.proyectoId)
      }))
    } else {
      // Obtener equipos de todos los proyectos
      for (const proyecto of proyectos) {
        const equipos = await getProyectoEquipoItems(proyecto.id)
        const equiposConProyecto = equipos.map(equipo => ({
          ...equipo,
          proyecto
        }))
        todosLosEquipos.push(...equiposConProyecto)
      }
    }
    
    // Aplicar filtros adicionales
    let equiposFiltrados = todosLosEquipos
    
    if (searchParams.estado && searchParams.estado !== 'todos') {
      equiposFiltrados = equiposFiltrados.filter(equipo => 
        equipo.estado === searchParams.estado
      )
    }
    
    if (searchParams.categoria && searchParams.categoria !== 'todos') {
      equiposFiltrados = equiposFiltrados.filter(equipo => 
        equipo.categoria === searchParams.categoria
      )
    }
    
    if (searchParams.busqueda) {
      const busqueda = searchParams.busqueda.toLowerCase()
      equiposFiltrados = equiposFiltrados.filter(equipo => 
        equipo.nombre?.toLowerCase().includes(busqueda) ||
        equipo.descripcion?.toLowerCase().includes(busqueda) ||
        equipo.codigo?.toLowerCase().includes(busqueda)
      )
    }
    
    // Paginación
    const page = parseInt(searchParams.page || '1')
    const limit = parseInt(searchParams.limit || '20')
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    
    const equiposPaginados = equiposFiltrados.slice(startIndex, endIndex)
    const totalPages = Math.ceil(equiposFiltrados.length / limit)
    
    return {
      items: equiposPaginados,
      pagination: {
        page,
        limit,
        total: equiposFiltrados.length,
        totalPages
      },
      proyectos
    }
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    return {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      proyectos: []
    }
  }
}

// 📊 Componente de estadísticas
function EstadisticasEquipos({ equipos }: { equipos: any[] }) {
  const stats = {
    total: equipos.length,
    disponibles: equipos.filter(e => e.estado === 'disponible').length,
    enUso: equipos.filter(e => e.estado === 'en_uso').length,
    mantenimiento: equipos.filter(e => e.estado === 'mantenimiento').length
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Equipos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            Equipos registrados
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.disponibles}</div>
          <p className="text-xs text-muted-foreground">
            Listos para usar
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Uso</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.enUso}</div>
          <p className="text-xs text-muted-foreground">
            Actualmente utilizados
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mantenimiento</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.mantenimiento}</div>
          <p className="text-xs text-muted-foreground">
            Requieren atención
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// 🎨 Loading Components
function LoadingStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LoadingTable() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function EquiposPage({ searchParams }: PageProps) {
  // 📊 Extract and validate search parameters
  const resolvedSearchParams = await searchParams
  const equiposData = await getEquiposData(resolvedSearchParams)
  
  // 🔧 Preparar filtros desde searchParams
  const filtros = {
    proyectoId: resolvedSearchParams.proyectoId || 'todos',
    estado: resolvedSearchParams.estado || 'todos',
    categoria: resolvedSearchParams.categoria || 'todos',
    busqueda: resolvedSearchParams.busqueda || ''
  }
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* 🧭 Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/proyectos">Proyectos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipos
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* 📋 Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Equipos de Proyectos
            </h1>
            <p className="text-sm text-gray-600 md:text-base">
              Gestión de equipos de todos los proyectos
            </p>
          </div>
        </div>
      </div>
      
      {/* 📊 Estadísticas */}
      <Suspense fallback={<LoadingStats />}>
        <EstadisticasEquipos equipos={equiposData.items} />
      </Suspense>
      
      {/* 🔍 Filtros */}
      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        <EquiposFiltersWrapper 
          filtros={filtros}
          proyectos={equiposData.proyectos}
        />
      </Suspense>
      
      {/* 📋 Tabla */}
      <Suspense fallback={<LoadingTable />}>
        <EquiposTableWrapper
          data={equiposData.items}
          pagination={equiposData.pagination}
        />
      </Suspense>
    </div>
  )
}