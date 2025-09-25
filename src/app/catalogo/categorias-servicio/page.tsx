'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import CategoriaServicioModal from '@/components/catalogo/CategoriaServicioModal'
import CategoriaServicioTableView from '@/components/catalogo/CategoriaServicioTableView'
import CategoriaServicioCardView from '@/components/catalogo/CategoriaServicioCardView'
import { getCategoriasServicio, createCategoriaServicio } from '@/lib/services/categoriaServicio'
import { toast } from 'sonner'
import { exportarCategoriasServicioAExcel } from '@/lib/utils/categoriaServicioExcel'
import {
  leerCategoriasServicioDesdeExcel,
  validarCategoriasServicio
} from '@/lib/utils/categoriaServicioImportUtils'
import type { CategoriaServicio } from '@/types'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChevronRight,
  FolderOpen,
  Plus,
  BarChart3,
  FileText,
  AlertCircle,
  Loader2,
  Package,
  Grid3X3,
  List
} from 'lucide-react'

export default function Page() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const cargarCategorias = async () => {
    try {
      setLoading(true)
      const data = await getCategoriasServicio()
      setCategorias(data)
    } catch (error) {
      console.error('Error al cargar categorías:', error)
      toast.error('Error al cargar las categorías de servicio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const handleCreated = (nueva: CategoriaServicio) => {
    setCategorias((prev) => [nueva, ...prev])
  }

  const handleUpdated = (actualizada: CategoriaServicio) => {
    setCategorias((prev) =>
      prev.map((c) => (c.id === actualizada.id ? actualizada : c))
    )
  }

  const handleDeleted = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  const handleExportar = () => {
    try {
      exportarCategoriasServicioAExcel(categorias)
      toast.success('Categorías exportadas exitosamente')
    } catch (err) {
      toast.error('Error al exportar categorías')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerCategoriasServicioDesdeExcel(file)
      const nombresExistentes = categorias.map(c => c.nombre)
      const { nuevas, errores: erroresImport } = validarCategoriasServicio(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevas.map(c => createCategoriaServicio({
        nombre: c.nombre,
        descripcion: c.descripcion
      })))
      toast.success(`${nuevas.length} categorías importadas correctamente`)
      cargarCategorias()
    } catch (err) {
      console.error('Error al importar categorías:', err)
      toast.error('Error inesperado en la importación')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        {/* Header Skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Form Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
        
        {/* List Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb Navigation */}
      <motion.nav 
        className="flex items-center space-x-2 text-sm text-muted-foreground"
        variants={itemVariants}
      >
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/catalogo')}
          className="h-auto p-0 font-normal"
        >
          Catálogo
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Categorías de Servicio</span>
      </motion.nav>

      {/* Header Section */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight">Categorías de Servicio</h1>
          </div>
          <p className="text-muted-foreground">
            Gestiona las categorías para clasificar los servicios del catálogo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={itemVariants}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Categorías</p>
                <p className="text-2xl font-bold">{categorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categorías Activas</p>
                <p className="text-2xl font-bold">{categorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <Badge variant="secondary" className="mt-1">
                  Operativo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Import Status */}
      {importando && (
        <motion.div variants={itemVariants}>
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Importando categorías, por favor espera...
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Import Errors */}
      {errores.length > 0 && (
        <motion.div variants={itemVariants}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Errores encontrados durante la importación:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {errores.map((err, idx) => (
                    <li key={idx} className="text-sm">{err}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Create Modal */}
      <CategoriaServicioModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

      <Separator />

      {/* Categories List */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Categorías Existentes
                </CardTitle>
                <CardDescription>
                  {categorias.length === 0
                    ? 'No hay categorías registradas aún'
                    : `${categorias.length} categoría${categorias.length !== 1 ? 's' : ''} registrada${categorias.length !== 1 ? 's' : ''}`
                  }
                </CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'cards')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Tabla
                  </TabsTrigger>
                  <TabsTrigger value="cards" className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Cards
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FolderOpen className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay categorías de servicio
                </h3>
                <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                  Comienza creando tu primera categoría de servicio para organizar el catálogo.
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera categoría
                </Button>
              </div>
            ) : viewMode === 'table' ? (
              <CategoriaServicioTableView
                data={categorias}
                onUpdate={handleUpdated}
                onDelete={handleDeleted}
                loading={loading}
              />
            ) : (
              <CategoriaServicioCardView
                data={categorias}
                onUpdate={handleUpdated}
                onDelete={handleDeleted}
                loading={loading}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
