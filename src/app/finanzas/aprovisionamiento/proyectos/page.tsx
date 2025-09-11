// ✅ Vista Consolidada de Proyectos - Aprovisionamiento Financiero
// 📡 Next.js 14 App Router - Server Component con filtros avanzados
// 🎯 Tabla con listas y pedidos por proyecto + resumen financiero

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Download, 
  Eye,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'

import Link from 'next/link'
import { 
  obtenerProyectosConsolidados,
  formatearMonto,
  formatearFecha,
  obtenerVariantProgreso,
  obtenerVariantAlertas,
  type ProyectoConsolidado,
  type KPIsConsolidados as KPIsType,
  type FiltrosAprovisionamiento
} from '@/lib/services/aprovisionamientoFinanciero'

// 🔁 Props para componentes
interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    estado?: string
    responsable?: string
    fechaInicio?: string
    fechaFin?: string
    alertas?: string
  }>
}

// 🔁 Componente principal de la página
export default async function AprovisionamientoProyectosPage({ searchParams }: PageProps) {
  try {
    // 📡 Await searchParams y construir filtros
    const params = await searchParams
    const filtros: FiltrosAprovisionamiento = {
       search: params?.search,
       estado: params?.estado as 'completado' | 'pausado' | 'activo' | undefined,
       responsable: params?.responsable,
       fechaInicio: params?.fechaInicio,
       fechaFin: params?.fechaFin,
       alertas: params?.alertas === 'true',
       page: parseInt(params?.page || '1'),
       limit: parseInt(params?.limit || '10')
     }

    return (
      <div className="space-y-6">
        {/* 🎯 Filtros - Manejados por searchParams */}
        
        {/* 📊 KPIs Consolidados */}
        <Suspense fallback={<KPIsSkeleton />}>
          <KPIsConsolidados filtros={filtros} />
        </Suspense>
        
        {/* 📋 Tabla de Proyectos */}
        <Suspense fallback={<TablaSkeleton />}>
          <TablaProyectos filtros={filtros} />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error('❌ Error al cargar proyectos:', error)
    
    // 🔄 Fallback con mensaje de error
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Proyectos Consolidados</CardTitle>
              <CardDescription>
                Vista integral de listas y pedidos por proyecto
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar proyectos</h3>
            <p className="text-muted-foreground mb-4">
              Ocurrió un error al obtener los datos. Por favor, intenta nuevamente.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
}

// 🔁 Componente KPIs con datos reales
async function KPIsConsolidados({ filtros }: { filtros?: any }) {
  try {
    // 📡 Obtener datos consolidados desde la API
    const response = await obtenerProyectosConsolidados(filtros)
    const kpis = response.kpis
    
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proyectos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalProyectos}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.proyectosActivos} activos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatearMonto(kpis.montoTotalListas)}</div>
            <p className="text-xs text-muted-foreground">
              {formatearMonto(kpis.montoTotalPedidos)} en pedidos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listas Activas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalListas}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalPedidos} pedidos totales
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpis.totalAlertas}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error('❌ Error al cargar KPIs:', error)
    return <KPIsSkeleton />
  }
}

// 🔁 Componente Tabla con datos reales
async function TablaProyectos({ filtros }: { filtros?: any }) {
  try {
    // 📡 Obtener proyectos reales desde la API
    const response = await obtenerProyectosConsolidados(filtros)
    const { data: proyectos, pagination } = response

    const getEstadoBadge = (estado: string) => {
      switch (estado) {
        case 'activo':
          return <Badge variant="default">Activo</Badge>
        case 'pausado':
          return <Badge variant="secondary">Pausado</Badge>
        case 'completado':
          return <Badge variant="outline">Completado</Badge>
        default:
          return <Badge variant="secondary">{estado}</Badge>
      }
    }
    
    // 🔄 Si no hay proyectos, mostrar estado vacío
    if (!proyectos || proyectos.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Proyectos Consolidados</CardTitle>
            <CardDescription>
              Vista integral de listas y pedidos por proyecto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
              <p className="text-muted-foreground mb-4">
                No se encontraron proyectos con los filtros aplicados.
              </p>
              <Button variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Crear Proyecto
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Proyectos Consolidados</CardTitle>
              <CardDescription>
                Vista integral de listas y pedidos por proyecto
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Presupuesto Listas</TableHead>
                  <TableHead>Presupuesto Comercial</TableHead>
                  <TableHead>Presupuesto Pedidos</TableHead>
                  <TableHead>Gastado</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Listas</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Alertas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyectos.map((proyecto: ProyectoConsolidado) => (
                  <TableRow key={proyecto.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{proyecto.nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          {proyecto.codigo}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{proyecto.cliente}</div>
                    </TableCell>
                    <TableCell>
                      {getEstadoBadge(proyecto.estado)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatearMonto(proyecto.presupuestoTotal)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatearMonto(proyecto.presupuestoComercial)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatearMonto(proyecto.presupuestoPedidos)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatearMonto(proyecto.presupuestoEjecutado)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={obtenerVariantProgreso(proyecto.progreso)}>
                          {proyecto.progreso}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <Badge variant="outline">
                          {proyecto.listas.total}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <Badge variant="secondary">
                          {proyecto.pedidos.total}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {proyecto.alertas > 0 && (
                        <Badge variant={obtenerVariantAlertas(proyecto.alertas)}>
                          {proyecto.alertas}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/proyectos/${proyecto.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* 📊 Información de paginación */}
          {pagination && (
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} proyectos
                </div>
                <div className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.pages}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('❌ Error al cargar tabla:', error)
    return <TablaSkeleton />
  }
}

// 🔁 Componentes Skeleton para loading states
function KPIsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TablaSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// 📡 Metadata para SEO y navegación
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Proyectos Consolidados | Aprovisionamiento Financiero | GYS',
  description: 'Vista consolidada de proyectos con seguimiento de listas y pedidos'
}
