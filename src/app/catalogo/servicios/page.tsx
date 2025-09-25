'use client'

// ===================================================
// 📁 Archivo: page.tsx (Mejorado con UX/UI moderno)
// 📍 Ubicación: src/app/catalogo/servicios/
// ===================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Services
import {
  getCatalogoServicios,
  createCatalogoServicio,
  updateCatalogoServicio,
  deleteCatalogoServicio,
} from '@/lib/services/catalogoServicio'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { exportarServiciosAExcel } from '@/lib/utils/serviciosExcel'
import {
  leerServiciosDesdeExcel,
  importarServiciosDesdeExcelValidado,
} from '@/lib/utils/serviciosImportUtils'

// Components
import CatalogoServicioCrearAcordeon from '@/components/catalogo/CatalogoServicioCrearAcordeon'
import CatalogoServicioTable from '@/components/catalogo/CatalogoServicioTable'
import CatalogoServicioForm from '@/components/catalogo/CatalogoServicioForm'
import ModalDuplicadosServicios from '@/components/catalogo/ModalDuplicadosServicios'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// Icons
import {
  ChevronRight,
  Settings,
  TrendingUp,
  AlertCircle,
  FileText,
  Upload,
  Loader2,
  Plus
} from 'lucide-react'

// Animation
import { motion } from 'framer-motion'

import type { CatalogoServicio } from '@/types'

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

export default function CatalogoServicioPage() {
  const router = useRouter()
  const [servicios, setServicios] = useState<CatalogoServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [duplicados, setDuplicados] = useState<{ id: string; nombre: string }[]>([])
  const [serviciosDuplicados, setServiciosDuplicados] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  const cargarServicios = async () => {
    try {
      setLoading(true)
      const data = await getCatalogoServicios()
      setServicios(data)
    } catch (err) {
      console.error('❌ Error al cargar servicios:', err)
      toast.error('Error al cargar servicios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarServicios()
  }, [])

  const handleCreated = () => {
    cargarServicios()
    setShowCreateModal(false)
  }

  const actualizarServicio = async (servicio: CatalogoServicio) => {
    try {
      await updateCatalogoServicio(servicio.id, servicio)
      toast.success('Servicio actualizado')
      await cargarServicios()
    } catch (err) {
      toast.error('Error al actualizar servicio')
      console.error('❌ Error al actualizar servicio:', err)
    }
  }

  const eliminarServicio = async (id: string) => {
    try {
      await deleteCatalogoServicio(id)
      toast.success('Servicio eliminado')
      await cargarServicios()
    } catch (error) {
      toast.error('Error al eliminar servicio')
      console.error('❌ Error al eliminar servicio:', error)
    }
  }

  const handleExportar = async () => {
    try {
      await exportarServiciosAExcel(servicios)
      toast.success('Servicios exportados exitosamente.')
    } catch (err) {
      console.error('❌ Error al exportar servicios:', err)
      toast.error('Error al exportar servicios.')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerServiciosDesdeExcel(file)
      const [categorias, unidades, recursos, serviciosExistentes] = await Promise.all([
        getCategoriasServicio(),
        getUnidadesServicio(),
        getRecursos(),
        getCatalogoServicios(),
      ])

      const { serviciosNuevos, serviciosDuplicados, errores } =
        await importarServiciosDesdeExcelValidado(
          datos,
          categorias,
          unidades,
          recursos,
          serviciosExistentes.map((s) => ({ nombre: s.nombre, id: s.id }))
        )

      if (errores.length > 0) {
        setErrores(errores)
        toast.error('Errores encontrados en la importación.')
        return
      }

      if (serviciosNuevos.length > 0) {
        await Promise.all(serviciosNuevos.map((servicio) => createCatalogoServicio(servicio)))
        toast.success(`${serviciosNuevos.length} servicios nuevos creados.`)
      }

      if (serviciosDuplicados.length > 0) {
        setDuplicados(serviciosDuplicados.map((d) => ({ id: d.id, nombre: d.nombre })))
        setServiciosDuplicados(serviciosDuplicados)
        setMostrarModal(true)
      } else {
        await cargarServicios()
      }
    } catch (err) {
      console.error('❌ Error inesperado al importar servicios:', err)
      toast.error('Error inesperado en la importación.')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const sobrescribirDuplicados = async () => {
    try {
      await Promise.all(serviciosDuplicados.map((servicio) => updateCatalogoServicio(servicio.id, servicio)))
      toast.success('Servicios duplicados sobrescritos exitosamente.')
      await cargarServicios()
    } catch (err) {
      console.error('❌ Error al sobrescribir duplicados:', err)
      toast.error('Error al sobrescribir duplicados.')
    } finally {
      setMostrarModal(false)
      setDuplicados([])
      setServiciosDuplicados([])
    }
  }

  const cancelarImportacion = () => {
    setMostrarModal(false)
    setDuplicados([])
    setServiciosDuplicados([])
    toast('Importación cancelada.')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
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
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="container mx-auto px-4 py-8 space-y-6"
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
        <span className="font-medium text-foreground">Servicios</span>
      </motion.nav>

      {/* Header Section */}
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Catálogo de Servicios
          </h1>
          <p className="text-muted-foreground">
            Gestiona los servicios disponibles para tus proyectos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Servicio</DialogTitle>
                <DialogDescription>
                  Agrega un nuevo servicio al catálogo con toda su configuración
                </DialogDescription>
              </DialogHeader>
              <CatalogoServicioForm onCreated={handleCreated} />
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
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Servicios</p>
                <p className="text-2xl font-bold">{servicios.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Servicios Activos</p>
                <p className="text-2xl font-bold text-green-600">{servicios.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categorías</p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Set(servicios.map(s => s.categoriaId)).size}
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
              Importando datos, por favor espere...
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Error Display */}
      {errores.length > 0 && (
        <motion.div variants={itemVariants}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Errores encontrados en la importación:</p>
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


      {/* Services Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Servicios</CardTitle>
            <CardDescription>
              {servicios.length === 0 
                ? "No hay servicios registrados" 
                : `${servicios.length} servicio${servicios.length !== 1 ? 's' : ''} registrado${servicios.length !== 1 ? 's' : ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {servicios.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay servicios</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primer servicio al catálogo
                </p>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Crear Servicio
                </Button>
              </div>
            ) : (
              <CatalogoServicioTable
                data={servicios}
                onUpdate={actualizarServicio}
                onDelete={eliminarServicio}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal for Duplicates */}
      {mostrarModal && (
        <ModalDuplicadosServicios
          duplicados={duplicados}
          onConfirm={sobrescribirDuplicados}
          onCancel={cancelarImportacion}
        />
      )}
    </motion.div>
  )
}
