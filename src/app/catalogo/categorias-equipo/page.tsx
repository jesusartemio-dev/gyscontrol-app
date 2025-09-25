'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCategoriasEquipo,
  createCategoriaEquipo
} from '@/lib/services/categoriaEquipo'
import { toast } from 'sonner'
import { exportarCategoriasEquipoAExcel } from '@/lib/utils/categoriaEquipoExcel'
import {
  leerCategoriasEquipoDesdeExcel,
  validarCategoriasEquipo
} from '@/lib/utils/categoriaEquipoImportUtils'
import type { CategoriaEquipo } from '@/types'
import CategoriaEquipoForm from '@/components/catalogo/CategoriaEquipoForm'
import CategoriaEquipoList from '@/components/catalogo/CategoriaEquipoList'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Icons
import { 
  ChevronRight, 
  Package, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  Upload,
  Loader2
} from 'lucide-react'

// Animations
import { motion } from 'framer-motion'

export default function CategoriasEquipoPage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  const cargarCategorias = async () => {
    try {
      setLoading(true)
      const data = await getCategoriasEquipo()
      setCategorias(data)
    } catch (error) {
      console.error('Error al cargar categorías:', error)
      toast.error('Error al cargar las categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const handleCreated = (nueva: CategoriaEquipo) => {
    setCategorias((prev) => [nueva, ...prev])
    setModalOpen(false)
  }

  const handleUpdated = (actualizada: CategoriaEquipo) => {
    setCategorias((prev) =>
      prev.map((c) => (c.id === actualizada.id ? actualizada : c))
    )
  }

  const handleDeleted = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  const handleExportar = () => {
    try {
      exportarCategoriasEquipoAExcel(categorias)
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
      const datos = await leerCategoriasEquipoDesdeExcel(file)
      const nombresExistentes = categorias.map(c => c.nombre)
      const { nuevas, errores: erroresImport } = validarCategoriasEquipo(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      await Promise.all(nuevas.map(c => createCategoriaEquipo({
        nombre: c.nombre,
        descripcion: c.descripcion || null
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
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
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

        {/* Form and List Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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
        <span className="font-medium text-foreground">Categorías de Equipos</span>
      </motion.nav>

      {/* Header Section */}
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Categorías de Equipos
          </h1>
          <p className="text-muted-foreground">
            Gestiona las categorías para organizar tu inventario de equipos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Package className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Categoría</DialogTitle>
                <DialogDescription>
                  Agrega una nueva categoría de equipo al catálogo
                </DialogDescription>
              </DialogHeader>
              <CategoriaEquipoForm onCreated={handleCreated} />
            </DialogContent>
          </Dialog>
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
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
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
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
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categorías Activas</p>
                <p className="text-2xl font-bold text-green-600">{categorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última Actualización</p>
                <p className="text-sm font-medium">
                  {categorias.length > 0 ? 'Hoy' : 'Sin datos'}
                </p>
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

      {/* Main Content */}
      <motion.div
        className="space-y-6"
        variants={itemVariants}
      >
        {/* List Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lista de Categorías
              </span>
              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'card')}>
                  <TabsList>
                    <TabsTrigger value="table">Tabla</TabsTrigger>
                    <TabsTrigger value="card">Cards</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Badge variant="secondary">
                  {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Administra las categorías existentes de equipos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay categorías registradas</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primera categoría de equipo
                </p>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar desde Excel
                </Button>
              </div>
            ) : (
              <CategoriaEquipoList
                data={categorias}
                onUpdate={handleUpdated}
                onDelete={handleDeleted}
                onRefresh={cargarCategorias}
                viewMode={viewMode}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
