// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/[id]/servicios/page.tsx
// 🔧 Descripción: Página de gestión de servicios del proyecto
// 🎨 Vista dual: Tabla (por defecto) y Cards con filtros
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-11-12
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

import { getProyectoById } from '@/lib/services/proyecto'
import type { Proyecto, ProyectoServicioCotizado } from '@/types'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

import {
  ChevronRight,
  Settings,
  AlertCircle,
  ArrowLeft,
  Table as TableIcon,
  Grid3X3,
  Filter,
  Search,
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react'

export default function ServiciosProyectoPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const router = useRouter()

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vistaActiva, setVistaActiva] = useState<'tabla' | 'cards'>('tabla')
  
  // Estados para filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('all')
  const [filtroEstado, setFiltroEstado] = useState('all')

  useEffect(() => {
    if (proyectoId) {
      cargarDatos()
    }
  }, [proyectoId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      const proyectoData = await getProyectoById(proyectoId)
      setProyecto(proyectoData)
    } catch (err) {
      setError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Filtrar servicios
  const serviciosFiltrados = proyecto?.servicios?.filter(servicio => {
    const matchBusqueda = !filtroBusqueda || 
      servicio.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      (servicio as any).edt?.nombre?.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      servicio.nombre?.toLowerCase().includes(filtroBusqueda.toLowerCase())
    
    const matchCategoria = filtroCategoria === 'all' || !filtroCategoria || (servicio as any).edt?.nombre === filtroCategoria
    
    const matchEstado = filtroEstado === 'all' || !filtroEstado || 
      (filtroEstado === 'con_items' && servicio.items?.length > 0) ||
      (filtroEstado === 'sin_items' && (!servicio.items || servicio.items.length === 0))
    
    return matchBusqueda && matchCategoria && matchEstado
  }) || []

  // Obtener categorías únicas (ahora EDTs)
  const categoriasUnicas = [...new Set(
    proyecto?.servicios?.map(s => s.categoria || (s as any).edt?.nombre).filter((nombre): nombre is string => nombre !== undefined) || []
  )]

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !proyecto) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto p-6"
      >
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar los datos</h3>
            <p className="text-red-600 mb-4 text-center">{error}</p>
            <Button onClick={() => router.push(`/proyectos/${proyectoId}`)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Proyecto
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-6 space-y-6"
    >
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/proyectos')}>
          Proyectos
        </Button>
        <ChevronRight className="h-4 w-4" />
        <Button variant="ghost" size="sm" onClick={() => router.push(`/proyectos/${proyectoId}`)}>
          {proyecto.nombre}
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Servicios</span>
      </nav>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8 text-purple-600" />
            Servicios del Proyecto
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
              {proyecto.estado || 'Sin estado'}
            </Badge>
            <span className="text-sm text-gray-600">
              {serviciosFiltrados.length} de {proyecto.servicios?.length || 0} servicios
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/proyectos/${proyectoId}`)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Proyecto
          </Button>
        </div>
      </motion.div>

      {/* Contenido Principal */}
      <Tabs value={vistaActiva} onValueChange={(value) => setVistaActiva(value as 'tabla' | 'cards')} className="space-y-6">
        {/* Header de Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="tabla" className="flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Vista Tabla
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Vista Cards
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Vista Tabla (Por Defecto) */}
        <TabsContent value="tabla" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filtros de Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Búsqueda por texto */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Búsqueda</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre o categoría..."
                      value={filtroBusqueda}
                      onChange={(e) => setFiltroBusqueda(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filtro por categoría */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoría</label>
                  <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categoriasUnicas.map(categoria => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por estado */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="con_items">Con ítems</SelectItem>
                      <SelectItem value="sin_items">Sin ítems</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Limpiar filtros */}
              {(filtroBusqueda || filtroCategoria !== 'all' || filtroEstado !== 'all') && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFiltroBusqueda('')
                      setFiltroCategoria('all')
                      setFiltroEstado('all')
                    }}
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla de Servicios */}
          <Card>
            <CardHeader>
              <CardTitle>Servicios ({serviciosFiltrados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {serviciosFiltrados.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servicio</TableHead>
                        <TableHead>EDT</TableHead>
                        <TableHead>Ítems</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Progreso</TableHead>
                        <TableHead>Total Cliente</TableHead>
                        <TableHead>Total Interno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviciosFiltrados.map((servicio) => {
                        const totalItems = servicio.items?.length || 0
                        const horasTotales = servicio.items?.reduce((sum, item) => sum + item.cantidadHoras, 0) || 0
                        const horasEjecutadas = servicio.items?.reduce((sum, item) => sum + item.horasEjecutadas, 0) || 0
                        const progreso = horasTotales > 0 ? (horasEjecutadas / horasTotales) * 100 : 0
                        const edtNombre = (servicio as any).edt?.nombre || 'Sin EDT asignado'

                        return (
                          <TableRow key={servicio.id}>
                            <TableCell className="font-medium">
                              {servicio.nombre}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {edtNombre}
                              </Badge>
                            </TableCell>
                            <TableCell>{totalItems}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{horasEjecutadas}h / {horasTotales}h</div>
                                <div className="text-gray-500 text-xs">
                                  {((horasEjecutadas / (horasTotales || 1)) * 100).toFixed(1)}%
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="w-20">
                                <Progress value={progreso} className="h-2" />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(servicio.subtotalCliente)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(servicio.subtotalInterno)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TableIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No se encontraron servicios</p>
                  <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vista Cards */}
        <TabsContent value="cards" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviciosFiltrados.map((servicio) => {
              const totalItems = servicio.items?.length || 0
              const horasTotales = servicio.items?.reduce((sum, item) => sum + item.cantidadHoras, 0) || 0
              const horasEjecutadas = servicio.items?.reduce((sum, item) => sum + item.horasEjecutadas, 0) || 0
              const progreso = horasTotales > 0 ? (horasEjecutadas / horasTotales) * 100 : 0

              return (
                <motion.div
                  key={servicio.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{servicio.nombre}</CardTitle>
                        <Badge variant="outline">
                          {(servicio as any).edt?.nombre || 'Sin EDT'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Estadísticas */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span>{totalItems} ítems</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{horasTotales}h planificadas</span>
                        </div>
                      </div>

                      {/* Progreso */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progreso</span>
                          <span className="font-medium">{Math.round(progreso)}%</span>
                        </div>
                        <Progress value={progreso} className="h-2" />
                        <div className="text-xs text-gray-500">
                          {horasEjecutadas}h ejecutadas de {horasTotales}h
                        </div>
                      </div>

                      {/* Totales Financieros */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(servicio.subtotalCliente)}
                          </div>
                          <div className="text-xs text-gray-600">Cliente</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-600">
                            {formatCurrency(servicio.subtotalInterno)}
                          </div>
                          <div className="text-xs text-gray-600">Interno</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {serviciosFiltrados.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Grid3X3 className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay servicios para mostrar</h3>
                <p className="text-gray-600 text-center">
                  {proyecto.servicios?.length === 0 
                    ? 'No hay servicios registrados en este proyecto.'
                    : 'No se encontraron servicios con los filtros aplicados.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}