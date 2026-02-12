import { Suspense } from 'react'
import { Metadata } from 'next'
import { CheckCircle, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { getProyectoEquipoItems } from '@/lib/services/proyectoEquipoItem'
import { getProyectos } from '@/lib/services/proyecto'
import { EquiposTableWrapper } from '@/components/proyectos/EquiposTableWrapper'
import { EquiposFiltersWrapper } from '@/components/proyectos/EquiposFiltersWrapper'
import { EquiposTabSwitcher } from '@/components/proyectos/EquiposTabSwitcher'
import { EquipoItemsGroupedView } from '@/components/proyectos/EquipoItemsGroupedView'

export const metadata: Metadata = {
  title: 'Equipos - Proyectos | GYS',
  description: 'Gestión de equipos de todos los proyectos'
}

interface PageProps {
  searchParams: Promise<{
    tab?: string
    proyectoId?: string
    estado?: string
    categoria?: string
    busqueda?: string
    page?: string
    limit?: string
  }>
}

async function getEquiposData(searchParams: Awaited<PageProps['searchParams']>) {
  try {
    const proyectos = await getProyectos()
    let todosLosEquipos: any[] = []

    if (searchParams.proyectoId && searchParams.proyectoId !== 'todos') {
      const equipos = await getProyectoEquipoItems(searchParams.proyectoId)
      todosLosEquipos = equipos.map(equipo => ({
        ...equipo,
        proyecto: proyectos.find(p => p.id === searchParams.proyectoId)
      }))
    } else {
      for (const proyecto of proyectos) {
        const equipos = await getProyectoEquipoItems(proyecto.id)
        const equiposConProyecto = equipos.map(equipo => ({
          ...equipo,
          proyecto
        }))
        todosLosEquipos.push(...equiposConProyecto)
      }
    }

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

    const page = parseInt(searchParams.page || '1')
    const limit = parseInt(searchParams.limit || '20')
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const equiposPaginados = equiposFiltrados.slice(startIndex, endIndex)
    const totalPages = Math.ceil(equiposFiltrados.length / limit)

    const stats = {
      total: equiposFiltrados.length,
      disponibles: equiposFiltrados.filter(e => e.estado === 'disponible').length,
      enUso: equiposFiltrados.filter(e => e.estado === 'en_uso').length,
      mantenimiento: equiposFiltrados.filter(e => e.estado === 'mantenimiento').length
    }

    return {
      items: equiposPaginados,
      allItems: equiposFiltrados,
      pagination: {
        page,
        limit,
        total: equiposFiltrados.length,
        totalPages
      },
      proyectos,
      stats
    }
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    return {
      items: [],
      allItems: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      proyectos: [],
      stats: { total: 0, disponibles: 0, enUso: 0, mantenimiento: 0 }
    }
  }
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}

export default async function EquiposPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const activeTab = resolvedSearchParams.tab || 'items'
  const equiposData = await getEquiposData(resolvedSearchParams)
  const { stats } = equiposData

  const filtros = {
    proyectoId: resolvedSearchParams.proyectoId || 'todos',
    estado: resolvedSearchParams.estado || 'todos',
    categoria: resolvedSearchParams.categoria || 'todos',
    busqueda: resolvedSearchParams.busqueda || ''
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header with tabs */}
      <EquiposTabSwitcher activeTab={activeTab} totalItems={stats.total} />

      {activeTab === 'agrupado' ? (
        /* Grouped view */
        <Suspense fallback={<LoadingState />}>
          <EquipoItemsGroupedView
            initialItems={equiposData.allItems}
            proyectos={equiposData.proyectos}
          />
        </Suspense>
      ) : (
        /* Flat items view (original) */
        <>
          {/* Inline Stats - Desktop */}
          <div className="hidden md:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-green-600" title="Disponibles">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.disponibles}</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600" title="En Uso">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.enUso}</span>
            </div>
            <div className="flex items-center gap-1 text-orange-600" title="Mantenimiento">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.mantenimiento}</span>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="md:hidden grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-600">{stats.disponibles}</div>
              <div className="text-[10px] text-green-700">Disponibles</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">{stats.enUso}</div>
              <div className="text-[10px] text-blue-700">En Uso</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-orange-600">{stats.mantenimiento}</div>
              <div className="text-[10px] text-orange-700">Mantenimiento</div>
            </div>
          </div>

          {/* Filters */}
          <Suspense fallback={<div className="h-10 bg-gray-100 rounded animate-pulse" />}>
            <EquiposFiltersWrapper
              filtros={filtros}
              proyectos={equiposData.proyectos}
            />
          </Suspense>

          {/* Table */}
          <Suspense fallback={<LoadingState />}>
            <EquiposTableWrapper
              data={equiposData.items}
              pagination={equiposData.pagination}
            />
          </Suspense>
        </>
      )}
    </div>
  )
}
