// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/unidades/
// 🔧 Página moderna de unidades con UX/UI mejorada
// ===================================================

'use client'

import { useEffect, useState } from 'react'
// import { motion } from 'framer-motion'
import UnidadModal from '@/components/catalogo/UnidadModal'
import UnidadTableView from '@/components/catalogo/UnidadTableView'
import UnidadCardView from '@/components/catalogo/UnidadCardView'
import { Unidad } from '@/types'
import { getUnidades, createUnidad } from '@/lib/services/unidad'
import { toast } from 'sonner'
import { exportarUnidadesAExcel } from '@/lib/utils/unidadExcel'
import {
  leerUnidadesDesdeExcel,
  validarUnidades
} from '@/lib/utils/unidadImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Calculator, TrendingUp, Package, Home, Settings, Loader2, Plus, Table, Grid, Search, Filter } from 'lucide-react'

export default function Page() {
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table') // Vista tabla por defecto
  const [searchTerm, setSearchTerm] = useState('')

  const cargarUnidades = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUnidades()
      setUnidades(data)
    } catch (err) {
      const errorMessage = 'Error al cargar las unidades'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error loading unidades:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarUnidades()
  }, [])

  const handleCreated = (nueva: Unidad) => {
    setUnidades((prev) => [nueva, ...prev])
    setError(null) // Clear any previous errors
    toast.success('Unidad creada exitosamente')
  }

  const handleUpdated = (actualizada: Unidad) => {
    setUnidades((prev) =>
      prev.map((u) => (u.id === actualizada.id ? actualizada : u))
    )
  }

  const handleDeleted = (id: string) => {
    setUnidades((prev) => prev.filter((u) => u.id !== id))
  }

  const handleExportar = async () => {
    try {
      exportarUnidadesAExcel(unidades)
      toast.success('Unidades exportadas')
    } catch (err) {
      toast.error('Error al exportar unidades')
    }
  }

  // Filtrar unidades basado en el término de búsqueda
  const filteredUnidades = unidades.filter(unidad =>
    unidad.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerUnidadesDesdeExcel(file)
      const nombresExistentes = unidades.map(u => u.nombre)
      const { nuevas, errores: erroresImport } = validarUnidades(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevas.map(u => createUnidad({ nombre: u.nombre })))
      toast.success(`${nuevas.length} unidades importadas correctamente`)
      cargarUnidades()
    } catch (err) {
       const errorMessage = 'Error inesperado en la importación'
       setError(errorMessage)
       console.error('Error al importar unidades:', err)
       toast.error(errorMessage)
     } finally {
       setImportando(false)
       e.target.value = ''
     }
  }

  // Animaciones - Temporalmente deshabilitadas
  // const containerVariants = {
  //   hidden: { opacity: 0 },
  //   visible: {
  //     opacity: 1,
  //     transition: {
  //       duration: 0.6,
  //       staggerChildren: 0.1
  //     }
  //   }
  // }

  // const itemVariants = {
  //   hidden: { opacity: 0, y: 20 },
  //   visible: {
  //     opacity: 1,
  //     y: 0,
  //     transition: { duration: 0.5 }
  //   }
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Inicio
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/catalogo" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Catálogo
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Unidades
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              Unidades
            </h1>
            <p className="text-gray-600 max-w-2xl">
              Gestiona las unidades de medida para los equipos de tu catálogo.
              Importa, exporta y administra de forma eficiente.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Unidad
            </Button>
            <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Unidades
              </CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{unidades.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {unidades.length === 0 ? 'No hay unidades' : 'Unidades registradas'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Estado
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Activo</div>
              <p className="text-xs text-gray-500 mt-1">
                Sistema funcionando correctamente
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Importación
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {importando ? 'En proceso' : 'Disponible'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {importando ? 'Procesando archivo...' : 'Listo para importar'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Import Status */}
         {importando && (
           <div>
             <Alert className="border-blue-200 bg-blue-50">
               <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
               <AlertTitle className="text-blue-800">Importando unidades...</AlertTitle>
               <AlertDescription className="text-blue-700">
                 Por favor espera mientras procesamos el archivo.
               </AlertDescription>
             </Alert>
           </div>
         )}

         {/* Error Alert */}
         {error && (
           <div>
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Error</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
           </div>
         )}

        {/* Import Errors */}
        {errores.length > 0 && (
          <div>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores de importación</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  {errores.map((error, index) => (
                    <div key={index} className="text-sm">
                      {error}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* View Controls and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Vista:</span>
                <div className="flex rounded-md border">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-r-none"
                  >
                    <Table className="h-4 w-4 mr-1" />
                    Tabla
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="rounded-l-none"
                  >
                    <Grid className="h-4 w-4 mr-1" />
                    Cards
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar unidades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    {filteredUnidades.length} resultado{filteredUnidades.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Unidades ({filteredUnidades.length})
            </CardTitle>
            <CardDescription>
              {viewMode === 'table' ? 'Vista tabular de unidades' : 'Vista de tarjetas de unidades'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUnidades.length === 0 && unidades.length > 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron unidades</h3>
                <p className="text-muted-foreground mb-4">
                  No hay unidades que coincidan con "{searchTerm}"
                </p>
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Limpiar búsqueda
                </Button>
              </div>
            ) : filteredUnidades.length === 0 ? (
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay unidades registradas</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primera unidad usando el botón "Nueva Unidad" en la parte superior
                </p>
                <Badge variant="outline">Sistema listo para usar</Badge>
              </div>
            ) : viewMode === 'table' ? (
              <UnidadTableView
                data={filteredUnidades}
                onUpdate={handleUpdated}
                onDelete={handleDeleted}
                loading={loading}
                error={error}
              />
            ) : (
              <UnidadCardView
                data={filteredUnidades}
                onUpdate={handleUpdated}
                onDelete={handleDeleted}
                loading={loading}
                error={error}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para crear unidades */}
      <UnidadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
