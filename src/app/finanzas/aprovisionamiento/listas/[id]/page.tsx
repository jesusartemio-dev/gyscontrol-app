/**
 * Página de Detalle de Lista de Equipos
 * 
 * Vista detallada de una lista específica con:
 * - Información general de la lista
 * - Tabla de equipos con edición inline
 * - Indicadores de coherencia y validaciones
 * - Historial de cambios
 * - Opciones de exportación y generación de pedidos
 * 
 * @author GYS Team
 * @version 2.0.0
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Share,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  History,
  Calculator,
  Eye,
  Copy,
  Trash2,
  Plus,
  Filter,
  Search,
  Home
} from 'lucide-react'
import Link from 'next/link'

// ✅ Components
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ListaEquipoItemList from '@/components/equipos/ListaEquipoItemList'
import { ListaEquipoFilters } from '@/components/finanzas/aprovisionamiento/ListaEquipoFilters'

// 📡 Services
import { getListaEquipo } from '@/lib/services/listas-equipo'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'

// 🎯 Types
import type { ListaEquipo, ListaEquipoItem, EstadoListaItem, OrigenListaItem } from '@/types'
import type { FiltrosListaEquipo } from '@/types/aprovisionamiento'

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    tab?: string
    search?: string
    categoria?: string
    page?: string
    limit?: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const lista = await getListaEquipo(id)
  
  if (!lista) {
    return {
      title: 'Lista no encontrada | GYS',
      description: 'La lista solicitada no existe'
    }
  }

  return {
    title: `${lista.codigo} | Lista de Equipos | GYS`,
    description: `Detalle de la lista de equipos ${lista.nombre}`
  }
}

export default async function ListaEquipoDetallePage({ params, searchParams }: PageProps) {
  // 📡 Extraer parámetros
  const { id } = await params
  const searchParamsResolved = await searchParams
  
  // 📡 Fetch lista data
  const lista = await getListaEquipo(id)
  
  if (!lista) {
    notFound()
  }

  // 📊 Pagination parameters
  const page = parseInt(searchParamsResolved.page || '1')
  const limit = parseInt(searchParamsResolved.limit || '10')
  const equipoSearch = searchParamsResolved.search || ''
  const equipoCategoria = searchParamsResolved.categoria || 'all'

  // 📡 Fetch equipos data
  const equiposItems = await getListaEquipoItemsByLista(id)
  
  // 🔍 Apply client-side filtering (in production, this should be done server-side)
  const filteredItems = equiposItems.filter(item => {
    const matchesSearch = !equipoSearch || 
      item.codigo?.toLowerCase().includes(equipoSearch.toLowerCase()) ||
      item.descripcion?.toLowerCase().includes(equipoSearch.toLowerCase())
    const matchesCategoria = equipoCategoria === 'all' || item.catalogoEquipo?.categoria?.nombre === equipoCategoria
    return matchesSearch && matchesCategoria
  })
  
  // 📄 Apply pagination
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedItems = filteredItems.slice(startIndex, endIndex)
  
  const equiposData = {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total: filteredItems.length,
      pages: Math.ceil(filteredItems.length / limit),
      hasNext: endIndex < filteredItems.length,
      hasPrev: page > 1
    }
  }

  // ✅ Datos reales de la API - sin mock data

  // 🔁 Calculate lista stats from real API data
  const totalEquipos = equiposData.pagination?.total || 0
      
  const stats = {
    totalEquipos,
    equiposValidados: equiposData.items?.filter(item => item.verificado).length || 0,
    montoTotal: equiposData.items?.reduce((sum, item) => sum + ((item.precioElegido || 0) * item.cantidad), 0) || 0,
    categorias: [...new Set(equiposData.items?.map(item => item.catalogoEquipo?.categoria?.nombre || 'Sin categoría') || [])].length,
    alertasCoherencia: equiposData.items?.filter(item => item.estado === 'por_revisar').length || 0,
    progresoValidacion: totalEquipos > 0 ? 
      Math.round(((equiposData.items?.filter(item => item.verificado).length || 0) / totalEquipos) * 100) : 0
  }

  const activeTab = searchParamsResolved.tab || 'equipos'

  return (
    <div className="container mx-auto p-6 space-y-6">
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
            <BreadcrumbLink href="/finanzas/aprovisionamiento">Aprovisionamiento</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finanzas/aprovisionamiento/listas">Listas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{lista.codigo}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 🎨 Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/finanzas/aprovisionamiento/listas">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{lista.nombre}</h1>
                <Badge variant={lista.estado === 'aprobado' ? 'default' : 
                              lista.estado === 'borrador' ? 'secondary' : 'outline'}>
                  {lista.estado}
                </Badge>
                {lista.coherencia !== undefined && lista.coherencia < 80 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Alerta
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                {lista.codigo} • Proyecto: {lista.proyecto?.nombre}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Generar Pedido
            </Button>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* 📊 Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEquipos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.categorias} categorías
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validación</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{stats.progresoValidacion}%</div>
              <Progress value={stats.progresoValidacion} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.equiposValidados} validados
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor estimado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={lista.estado === 'aprobado' ? 'default' : 'secondary'}>
                {lista.estado}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {lista.fechaAprobacionFinal ? 
                `Aprobada ${new Date(lista.fechaAprobacionFinal).toLocaleDateString('es-PE')}` : 
                'Pendiente aprobación'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.alertasCoherencia}
            </div>
            <p className="text-xs text-muted-foreground">
              Alertas de coherencia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Modificación</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {lista.fechaModificacion ? 
                new Date(lista.fechaModificacion).toLocaleDateString('es-PE') : 
                'No disponible'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Por {lista.modificadoPor || 'Sistema'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 📋 Tabs Content */}
      <Tabs value={activeTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="equipos" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Equipos ({stats.totalEquipos})</span>
          </TabsTrigger>
          <TabsTrigger value="informacion" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Información</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Historial</span>
          </TabsTrigger>
        </TabsList>

        {/* 📦 Equipos Tab */}
        <TabsContent value="equipos" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Equipos de la Lista</span>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Equipo
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <ListaEquipoFilters
                  filtros={{
                    busqueda: searchParamsResolved.search || '',
                    categoria: searchParamsResolved.categoria || undefined
                  }}
                  onFiltrosChange={(filtros) => {
                    const params = new URLSearchParams(window.location.search)
                    if (filtros.busqueda) {
                      params.set('search', filtros.busqueda)
                    } else {
                      params.delete('search')
                    }
                    if (filtros.categoria && filtros.categoria !== 'all') {
                      params.set('categoria', filtros.categoria)
                    } else {
                      params.delete('categoria')
                    }
                    window.location.href = `/finanzas/aprovisionamiento/listas/${id}?${params.toString()}`
                  }}
                  loading={false}
                  showQuickFilters={true}
                  className="w-full"
                />
              </div>

              {/* Equipment List */}
               <ListaEquipoItemList 
                 listaId={lista.id}
                 proyectoId={lista.proyecto?.id || ''}
                 items={equiposData.items}
                 editable={true}
                 onCreated={async () => {
                   // Refresh page to show new item
                   window.location.reload()
                 }}
                 onItemUpdated={async (itemId: string) => {
                   // Refresh specific item or entire list
                   console.log(`Item ${itemId} updated, refreshing...`)
                   window.location.reload()
                 }}
                 onItemsUpdated={async () => {
                   // Refresh equipment data after bulk operations
                   console.log('Items updated, refreshing...')
                   window.location.reload()
                 }}
                 onRefresh={async () => {
                   // Manual refresh triggered by user
                   window.location.reload()
                 }}
               />

              {/* 📄 Equipment Pagination */}
              {totalEquipos > limit && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, totalEquipos)} de {totalEquipos} equipos
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => {
                        const params = new URLSearchParams(window.location.search)
                        params.set('page', (page - 1).toString())
                        window.location.href = `/finanzas/aprovisionamiento/listas/${id}?${params.toString()}`
                      }}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {page} de {Math.ceil(totalEquipos / limit)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(totalEquipos / limit)}
                      onClick={() => {
                        const params = new URLSearchParams(window.location.search)
                        params.set('page', (page + 1).toString())
                        window.location.href = `/finanzas/aprovisionamiento/listas/${id}?${params.toString()}`
                      }}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}

              {/* Summary Row */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Total: {stats.totalEquipos} equipos • {stats.equiposValidados} validados
                  </div>
                  <div className="text-lg font-bold">
                    Monto Total: ${stats.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📄 Información Tab */}
        <TabsContent value="informacion" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Información de la Lista</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-sm font-medium text-muted-foreground">Código</label>
                     <p className="text-sm font-mono">{lista.codigo}</p>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-muted-foreground">Estado</label>
                     <p className="text-sm">
                       <Badge variant={lista.estado === 'aprobado' ? 'default' : 'secondary'}>
                         {lista.estado}
                       </Badge>
                     </p>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-muted-foreground">Fecha Creación</label>
                     <p className="text-sm">
                       {lista.createdAt ? new Date(lista.createdAt).toLocaleDateString('es-PE') : 'No disponible'}
                     </p>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-muted-foreground">Fecha Aprobación Final</label>
                     <p className="text-sm">
                       {lista.fechaAprobacionFinal ? new Date(lista.fechaAprobacionFinal).toLocaleDateString('es-PE') : 'Pendiente'}
                     </p>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-muted-foreground">Número Secuencia</label>
                     <p className="text-sm">{lista.numeroSecuencia}</p>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-muted-foreground">Fecha Necesaria</label>
                     <p className="text-sm">
                       {lista.fechaNecesaria ? new Date(lista.fechaNecesaria).toLocaleDateString('es-PE') : 'No definida'}
                     </p>
                   </div>
                 </div>
                 {lista.coherencia !== undefined && (
                   <div>
                     <label className="text-sm font-medium text-muted-foreground">Coherencia Financiera</label>
                     <p className="text-sm mt-1 p-3 bg-muted rounded">
                       {lista.coherencia}% de coherencia
                     </p>
                   </div>
                 )}
               </CardContent>
            </Card>

            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Información del Proyecto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lista.proyecto ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nombre del Proyecto</label>
                      <p className="text-sm font-medium">{lista.proyecto.nombre}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Código del Proyecto</label>
                      <p className="text-sm font-mono">{lista.proyecto.codigo}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado del Proyecto</label>
                      <p className="text-sm">
                        <Badge variant="secondary">
                          Activo
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Responsable</label>
                      <p className="text-sm">No asignado</p>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/finanzas/aprovisionamiento/proyectos/${lista.proyecto.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Proyecto
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay proyecto asociado</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coherence Alerts */}
          {stats.alertasCoherencia > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Alertas de Coherencia ({stats.alertasCoherencia})</span>
                </CardTitle>
                <CardDescription>
                  Se han detectado inconsistencias que requieren atención
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {equiposData.items
                    ?.filter(equipo => equipo.estado === 'rechazado' || equipo.verificado === false)
                    .slice(0, 5)
                    .map((equipo) => (
                      <div key={equipo.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded">
                        <div>
                          <p className="font-medium">{equipo.codigo} - {equipo.descripcion}</p>
                          <p className="text-sm text-muted-foreground">
                            {equipo.estado === 'rechazado' ? 'Equipo rechazado' : 'Requiere verificación'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Revisar
                        </Button>
                      </div>
                    )) || []
                  }
                  {stats.alertasCoherencia > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Y {stats.alertasCoherencia - 5} alertas más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 📜 Historial Tab */}
        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Historial de Cambios</span>
              </CardTitle>
              <CardDescription>
                Registro de todas las modificaciones realizadas en la lista
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock history entries */}
                <div className="flex items-start space-x-3 pb-4 border-b">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Lista aprobada</p>
                      <span className="text-sm text-muted-foreground">Hace 2 días</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Por: Juan Pérez</p>
                    <p className="text-sm mt-1">La lista ha sido aprobada y está lista para generar pedidos</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 pb-4 border-b">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Equipo modificado</p>
                      <span className="text-sm text-muted-foreground">Hace 3 días</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Por: María García</p>
                    <p className="text-sm mt-1">Actualizado precio unitario del equipo EQ-001 de $1,200.00 a $1,350.00</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 pb-4 border-b">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Alerta de coherencia</p>
                      <span className="text-sm text-muted-foreground">Hace 4 días</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Por: Sistema</p>
                    <p className="text-sm mt-1">Detectada diferencia de precios en equipo EQ-003 comparado con listas similares</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 pb-4">
                  <div className="w-2 h-2 bg-gray-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Lista creada</p>
                      <span className="text-sm text-muted-foreground">Hace 1 semana</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Por: Carlos López</p>
                    <p className="text-sm mt-1">Lista de equipos creada con 15 elementos iniciales</p>
                  </div>
                </div>
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
        <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
        <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
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
            Error al cargar la lista
          </CardTitle>
          <CardDescription>
            Ha ocurrido un error al cargar los detalles de la lista
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || 'Error desconocido al cargar los datos'}
          </p>
          <div className="flex space-x-2">
            <Button onClick={reset}>
              Reintentar
            </Button>
            <Button variant="outline" asChild>
              <Link href="/finanzas/aprovisionamiento/listas">
                Volver a Listas
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}