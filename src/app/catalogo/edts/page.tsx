'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import EdtModal from '@/components/catalogo/EdtModal'
import EdtTableView from '@/components/catalogo/EdtTableView'
import EdtCardView from '@/components/catalogo/EdtCardView'
import { getEdts, createEdt } from '@/lib/services/edt'
import { toast } from 'sonner'
import { exportarEdtsAExcel } from '@/lib/utils/edtExcel'
import {
  leerEdtsDesdeExcel,
  validarEdts
} from '@/lib/utils/edtImportUtils'
import type { Edt } from '@/types'
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
  const [edts, setEdts] = useState<Edt[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const cargarEdts = async () => {
    try {
      setLoading(true)
      const data = await getEdts()
      setEdts(data)
    } catch (error) {
      console.error('Error al cargar EDTs:', error)
      toast.error('Error al cargar los EDTs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEdts()
  }, [])

  const handleCreated = (nueva: Edt) => {
    setEdts((prev) => [nueva, ...prev])
  }

  const handleUpdated = (actualizada: Edt) => {
    setEdts((prev) =>
      prev.map((c) => (c.id === actualizada.id ? actualizada : c))
    )
  }

  const handleDeleted = (id: string) => {
    setEdts((prev) => prev.filter((c) => c.id !== id))
  }

  const handleExportar = () => {
    try {
      exportarEdtsAExcel(edts)
      toast.success('EDTs exportados exitosamente')
    } catch (err) {
      toast.error('Error al exportar EDTs')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerEdtsDesdeExcel(file)
      const nombresExistentes = edts.map(c => c.nombre)
      const { nuevos, errores: erroresImport } = validarEdts(datos, nombresExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Errores encontrados en la importación')
        return
      }

      // Función auxiliar para encontrar fase por defecto por nombre
      const encontrarFasePorNombre = async (nombreFase: string): Promise<string | undefined> => {
        if (!nombreFase) return undefined
        try {
          const response = await fetch('/api/configuracion/fases-default')
          if (response.ok) {
            const data = await response.json()
            const fase = data.data?.find((f: any) => f.nombre.toLowerCase() === nombreFase.toLowerCase())
            return fase?.id
          }
        } catch (error) {
          console.error('Error buscando fase por defecto:', error)
        }
        return undefined
      }

      await Promise.all(nuevos.map(async (c) => {
        const faseDefaultId = c.fasePorDefecto ? await encontrarFasePorNombre(c.fasePorDefecto) : undefined
        return createEdt({
          nombre: c.nombre,
          descripcion: c.descripcion,
          faseDefaultId
        })
      }))
      toast.success(`${nuevos.length} EDTs importados correctamente`)
      cargarEdts()
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
        <span className="font-medium text-foreground">EDTs</span>
      </motion.nav>

      {/* Header Section */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight">EDTs</h1>
          </div>
          <p className="text-muted-foreground">
            Gestiona los EDTs para organizar los servicios del catálogo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo EDT
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
                <p className="text-sm font-medium text-muted-foreground">Total EDTs</p>
                <p className="text-2xl font-bold">{edts.length}</p>
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
                <p className="text-sm font-medium text-muted-foreground">EDTs Activos</p>
                <p className="text-2xl font-bold">{edts.length}</p>
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
      <EdtModal
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
                  EDTs Existentes
                </CardTitle>
                <CardDescription>
                  {edts.length === 0
                    ? 'No hay EDTs registrados aún'
                    : `${edts.length} EDT${edts.length !== 1 ? 's' : ''} registrado${edts.length !== 1 ? 's' : ''}`
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
            {edts.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FolderOpen className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay EDTs
                </h3>
                <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                  Comienza creando tu primer EDT para organizar el catálogo.
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer EDT
                </Button>
              </div>
            ) : viewMode === 'table' ? (
              <EdtTableView
                data={edts}
                onUpdate={handleUpdated}
                onDelete={handleDeleted}
                loading={loading}
              />
            ) : (
              <EdtCardView
                data={edts}
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
