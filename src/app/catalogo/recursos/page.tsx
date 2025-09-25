// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/recursos/
// 🔧 Página moderna de recursos con UX/UI mejorada
// 🎨 Mejoras aplicadas: Framer Motion, Shadcn/UI, Estados de carga, Breadcrumb navigation
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getRecursos, createRecurso } from '@/lib/services/recurso'
import { Recurso } from '@/types'
import RecursoModal from '@/components/catalogo/RecursoModal'
import RecursoTableView from '@/components/catalogo/RecursoTableView'
import RecursoCardView from '@/components/catalogo/RecursoCardView'
import { toast } from 'sonner'
import { exportarRecursosAExcel } from '@/lib/utils/recursoExcel'
import {
  leerRecursosDesdeExcel,
  validarRecursos
} from '@/lib/utils/recursoImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Calculator, TrendingUp, Package, Home, Settings, Loader2, Plus, Table, Grid, Search, Filter } from 'lucide-react'

// Currency formatter
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

// Variantes de animación para Framer Motion
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
}

export default function Page() {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table') // Vista tabla por defecto
  const [searchTerm, setSearchTerm] = useState('')

  const cargarRecursos = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getRecursos()
      setRecursos(data)
    } catch (err) {
      const errorMessage = 'Error al cargar los recursos'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error loading recursos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarRecursos()
  }, [])

  const handleCreated = (nuevo: Recurso) => {
    setRecursos((prev) => [nuevo, ...prev])
    setError(null) // Clear any previous errors
    toast.success('Recurso creado exitosamente')
  }

  const handleUpdated = (actualizado: Recurso) => {
    setRecursos((prev) =>
      prev.map((r) => (r.id === actualizado.id ? actualizado : r))
    )
    setError(null)
    toast.success('Recurso actualizado exitosamente')
  }

  const handleDeleted = (id: string) => {
    setRecursos((prev) => prev.filter((r) => r.id !== id))
    setError(null)
    toast.success('Recurso eliminado exitosamente')
  }

  const handleExportar = () => {
    try {
      exportarRecursosAExcel(recursos)
      toast.success('Recursos exportados exitosamente')
    } catch (err) {
      toast.error('Error al exportar recursos')
    }
  }

  // Filtrar recursos basado en el término de búsqueda
  const filteredRecursos = recursos.filter(recurso =>
    recurso.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerRecursosDesdeExcel(file)
      const nombresExistentes = recursos.map(r => r.nombre)
      const { nuevos, errores: erroresImport } = validarRecursos(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevos.map(r => createRecurso({ nombre: r.nombre, costoHora: r.costoHora })))
      toast.success(`${nuevos.length} recursos importados correctamente`)
      cargarRecursos()
    } catch (err) {
      const errorMessage = 'Error inesperado en la importación'
      setError(errorMessage)
      console.error('Error al importar recursos:', err)
      toast.error(errorMessage)
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  // Estado de carga
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Skeleton Breadcrumb */}
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
          
          {/* Skeleton Header */}
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded w-48 animate-pulse" />
          </div>
          
          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
          
          {/* Skeleton Content */}
          <div className="grid grid-cols-1 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="container mx-auto px-4 py-8 max-w-7xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <motion.div variants={itemVariants}>
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
                  <Calculator className="h-4 w-4" />
                  Recursos
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </motion.div>

        {/* Header Section */}
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          variants={itemVariants}
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Calculator className="h-8 w-8 text-blue-600" />
              Gestión de Recursos
            </h1>
            <p className="text-muted-foreground mt-2">
              Administra los recursos humanos y sus costos por hora
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Recurso
            </Button>
            <BotonesImportExport
              onExportar={handleExportar}
              onImportar={handleImportar}
              importando={importando}
            />
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={itemVariants}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recursos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recursos.length}</div>
              <p className="text-xs text-muted-foreground">
                Recursos registrados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Costo Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recursos.length > 0
                  ? formatCurrency(recursos.reduce((sum, r) => sum + r.costoHora, 0) / recursos.length)
                  : formatCurrency(0)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Por hora
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Costo Máximo</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recursos.length > 0
                  ? formatCurrency(Math.max(...recursos.map(r => r.costoHora)))
                  : formatCurrency(0)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Recurso más costoso
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado</CardTitle>
              <Badge variant={recursos.length > 0 ? "default" : "secondary"}>
                {recursos.length > 0 ? "Activo" : "Vacío"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {importando ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Importando...</span>
                  </div>
                ) : (
                  "✓"
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sistema operativo
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* Error State */}
        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Import Errors */}
        {errores.length > 0 && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores de Importación</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {errores.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Main Content */}
        <motion.div variants={itemVariants} className="space-y-6">
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
                      placeholder="Buscar recursos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {searchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      {filteredRecursos.length} resultado{filteredRecursos.length !== 1 ? 's' : ''}
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
                Recursos ({filteredRecursos.length})
              </CardTitle>
              <CardDescription>
                {viewMode === 'table' ? 'Vista tabular de recursos' : 'Vista de tarjetas de recursos'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRecursos.length === 0 && recursos.length > 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No se encontraron recursos</h3>
                  <p className="text-muted-foreground mb-4">
                    No hay recursos que coincidan con "{searchTerm}"
                  </p>
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : filteredRecursos.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay recursos registrados</h3>
                  <p className="text-muted-foreground mb-4">
                    Comienza agregando tu primer recurso usando el botón "Nuevo Recurso" en la parte superior
                  </p>
                  <Badge variant="outline">Sistema listo para usar</Badge>
                </div>
              ) : viewMode === 'table' ? (
                <RecursoTableView
                  data={filteredRecursos}
                  onUpdate={handleUpdated}
                  onDelete={handleDeleted}
                  loading={loading}
                  error={error}
                />
              ) : (
                <RecursoCardView
                  data={filteredRecursos}
                  onUpdate={handleUpdated}
                  onDelete={handleDeleted}
                  loading={loading}
                  error={error}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modal para crear recursos */}
      <RecursoModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </motion.div>
  )
}
