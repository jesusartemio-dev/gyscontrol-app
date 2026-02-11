/**
 * Vista Consolidada de Proyectos - Aprovisionamiento Financiero
 * Diseño minimalista con tabla compacta
 */

import { Suspense } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  Eye,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  FolderOpen,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import {
  obtenerProyectosConsolidados,
  formatearMonto,
  obtenerVariantProgreso,
  obtenerVariantAlertas,
  type ProyectoConsolidado,
  type FiltrosAprovisionamiento
} from '@/lib/services/aprovisionamientoFinanciero'

interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    estado?: string
  }>
}

export default async function AprovisionamientoProyectosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filtros: FiltrosAprovisionamiento = {
    search: params?.search,
    estado: params?.estado as 'completado' | 'pausado' | 'activo' | undefined,
    page: parseInt(params?.page || '1'),
    limit: parseInt(params?.limit || '15')
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href="/finanzas/aprovisionamiento">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Dashboard
            </Link>
          </Button>
          <FolderOpen className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-semibold">Proyectos Consolidados</h1>
        </div>
      </div>

      {/* KPIs compactos */}
      <Suspense fallback={<KPIsSkeleton />}>
        <KPIsConsolidados filtros={filtros} />
      </Suspense>

      {/* Tabla */}
      <Suspense fallback={<TablaSkeleton />}>
        <TablaProyectos filtros={filtros} />
      </Suspense>
    </div>
  )
}

async function KPIsConsolidados({ filtros }: { filtros?: FiltrosAprovisionamiento }) {
  try {
    const response = await obtenerProyectosConsolidados(filtros)
    const kpis = response.kpis

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Proyectos</span>
            <Package className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold">{kpis.totalProyectos}</p>
          <p className="text-[10px] text-muted-foreground">{kpis.proyectosActivos} activos</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Presupuesto</span>
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-lg font-bold">{formatearMonto(kpis.montoTotalListas)}</p>
          <p className="text-[10px] text-muted-foreground">{formatearMonto(kpis.montoTotalPedidos)} pedidos</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Listas</span>
            <ShoppingCart className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold">{kpis.totalListas}</p>
          <p className="text-[10px] text-muted-foreground">{kpis.totalPedidos} pedidos</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Alertas</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-600">{kpis.totalAlertas}</p>
          <p className="text-[10px] text-muted-foreground">Requieren atención</p>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error al cargar KPIs:', error)
    return <KPIsSkeleton />
  }
}

async function TablaProyectos({ filtros }: { filtros?: FiltrosAprovisionamiento }) {
  try {
    const response = await obtenerProyectosConsolidados(filtros)
    const { data: proyectos, pagination } = response

    const getEstadoBadge = (estado: string) => {
      switch (estado) {
        case 'activo':
          return <Badge className="bg-green-100 text-green-700 text-[10px] h-5">Activo</Badge>
        case 'pausado':
          return <Badge className="bg-yellow-100 text-yellow-700 text-[10px] h-5">Pausado</Badge>
        case 'completado':
          return <Badge className="bg-gray-100 text-gray-700 text-[10px] h-5">Completado</Badge>
        default:
          return <Badge variant="secondary" className="text-[10px] h-5">{estado}</Badge>
      }
    }

    if (!proyectos || proyectos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-white">
          <Package className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">No hay proyectos</p>
        </div>
      )
    }

    return (
      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium">Proyecto</TableHead>
              <TableHead className="text-xs font-medium">Cliente</TableHead>
              <TableHead className="text-xs font-medium w-20">Estado</TableHead>
              <TableHead className="text-xs font-medium text-right">Pres. Listas</TableHead>
              <TableHead className="text-xs font-medium text-right">Pres. Comercial</TableHead>
              <TableHead className="text-xs font-medium text-right">Ejecutado</TableHead>
              <TableHead className="text-xs font-medium text-center w-16">Prog.</TableHead>
              <TableHead className="text-xs font-medium text-center w-16">Listas</TableHead>
              <TableHead className="text-xs font-medium text-center w-16">Pedidos</TableHead>
              <TableHead className="text-xs font-medium text-center w-16">Alertas</TableHead>
              <TableHead className="text-xs font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proyectos.map((proyecto: ProyectoConsolidado) => (
              <TableRow key={proyecto.id} className="hover:bg-gray-50/50">
                <TableCell className="py-2">
                  <div>
                    <p className="text-xs font-medium truncate max-w-[180px]" title={proyecto.nombre}>
                      {proyecto.nombre}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">{proyecto.codigo}</p>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs truncate max-w-[120px] block" title={proyecto.cliente}>
                    {proyecto.cliente}
                  </span>
                </TableCell>
                <TableCell className="py-2">{getEstadoBadge(proyecto.estado)}</TableCell>
                <TableCell className="py-2 text-right">
                  <span className="text-xs font-medium">{formatearMonto(proyecto.presupuestoTotal)}</span>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <span className="text-xs">{formatearMonto(proyecto.presupuestoComercial)}</span>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <span className="text-xs">{formatearMonto(proyecto.presupuestoEjecutado)}</span>
                </TableCell>
                <TableCell className="py-2 text-center">
                  <Badge variant={obtenerVariantProgreso(proyecto.progreso)} className="text-[10px] h-5 px-1.5">
                    {proyecto.progreso}%
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-center">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">{proyecto.listas.total}</Badge>
                </TableCell>
                <TableCell className="py-2 text-center">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{proyecto.pedidos.total}</Badge>
                </TableCell>
                <TableCell className="py-2 text-center">
                  {proyecto.alertas > 0 && (
                    <Badge variant={obtenerVariantAlertas(proyecto.alertas)} className="text-[10px] h-5 px-1.5">
                      {proyecto.alertas}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                    <Link href={`/finanzas/aprovisionamiento/proyectos/${proyecto.id}`}>
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {pagination && (
          <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
            <span>
              {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              {pagination.page > 1 ? (
                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" asChild>
                  <Link href={`/finanzas/aprovisionamiento/proyectos?page=${pagination.page - 1}${filtros?.search ? `&search=${filtros.search}` : ''}${filtros?.estado ? `&estado=${filtros.estado}` : ''}`}>
                    Anterior
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled>Anterior</Button>
              )}
              <span>Pág. {pagination.page}/{pagination.pages}</span>
              {pagination.page < pagination.pages ? (
                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" asChild>
                  <Link href={`/finanzas/aprovisionamiento/proyectos?page=${pagination.page + 1}${filtros?.search ? `&search=${filtros.search}` : ''}${filtros?.estado ? `&estado=${filtros.estado}` : ''}`}>
                    Siguiente
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled>Siguiente</Button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error al cargar tabla:', error)
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-white">
        <AlertTriangle className="h-10 w-10 text-red-300 mb-3" />
        <p className="text-sm text-muted-foreground">Error al cargar proyectos</p>
        <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    )
  }
}

function KPIsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  )
}

function TablaSkeleton() {
  return (
    <div className="border rounded-lg bg-white p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Proyectos | Aprovisionamiento | GYS',
  description: 'Vista consolidada de proyectos con seguimiento de aprovisionamiento'
}
