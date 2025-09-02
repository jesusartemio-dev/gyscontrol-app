// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/equipos/
// 🔧 Descripción: Gestión de catálogo de equipos con UX/UI mejorada
//
// 🎨 Mejoras UX/UI aplicadas:
// - Diseño moderno con Framer Motion
// - Header mejorado con navegación breadcrumb
// - Estados de carga y error optimizados
// - Layout responsivo con estadísticas
// - Componentes shadcn/ui consistentes
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import CatalogoEquipoCrearAcordeon from '@/components/catalogo/CatalogoEquipoCrearAcordeon'
import CatalogoEquipoList from '@/components/catalogo/CatalogoEquipoList'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { exportarEquiposAExcel, importarEquiposDesdeExcel } from '@/lib/utils/equiposExcel'
import { importarEquiposDesdeExcelValidado } from '@/lib/utils/equiposImportUtils'
import { recalcularCatalogoEquipo } from '@/lib/utils/recalculoCatalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import { createCatalogoEquipo, updateCatalogoEquipo, getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import type { CatalogoEquipo, CatalogoEquipoPayload } from '@/types'

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Icons
import { 
  ChevronRight, 
  Settings, 
  TrendingUp, 
  AlertCircle, 
  Package, 
  Upload,
  Download,
  Share2,
  Edit,
  Loader2
} from 'lucide-react'

type CatalogoEquipoConId = CatalogoEquipoPayload & { id: string }

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

export default function CatalogoEquipoPage() {
  const router = useRouter()
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [equiposNuevos, setEquiposNuevos] = useState<CatalogoEquipoPayload[]>([])
  const [equiposDuplicados, setEquiposDuplicados] = useState<CatalogoEquipoConId[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargarEquipos = async () => {
    try {
      setLoading(true)
      const data = await getCatalogoEquipos()
      setEquipos(data)
    } catch (err) {
      console.error('❌ Error al cargar equipos:', err)
      toast.error('Error al cargar equipos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEquipos()
  }, [])

  const handleCreated = () => cargarEquipos()
  const handleUpdated = () => cargarEquipos()
  const handleDeleted = () => cargarEquipos()

  const handleExportar = async () => {
    try {
      await exportarEquiposAExcel(equipos)
      toast.success('Equipos exportados exitosamente.')
    } catch (err) {
      console.error('❌ Error al exportar:', err)
      toast.error('Error al exportar equipos.')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])
    setMostrarModal(false)

    try {
      const datos = await importarEquiposDesdeExcel(file)
      const [categorias, unidades, equiposExistentes] = await Promise.all([
        getCategoriasEquipo(),
        getUnidades(),
        getCatalogoEquipos()
      ])

      const codigosExistentes = equiposExistentes.map(eq => eq.codigo)
      const idPorCodigo: Record<string, string> = equiposExistentes.reduce((acc, eq) => {
        acc[eq.codigo] = eq.id
        return acc
      }, {} as Record<string, string>)

      const { equiposValidos, errores } = await importarEquiposDesdeExcelValidado(
        datos,
        categorias,
        unidades,
        codigosExistentes
      )

      if (errores.length > 0) {
        setErrores(errores)
        toast.error('Errores encontrados en la importación.')
        return
      }

      const nuevos: CatalogoEquipoPayload[] = []
      const duplicados: CatalogoEquipoConId[] = []

      for (const eq of equiposValidos) {
        const payload: CatalogoEquipoPayload = {
          codigo: eq.codigo,
          descripcion: eq.descripcion,
          marca: eq.marca,
          precioInterno: eq.precioInterno,
          margen: eq.margen,
          precioVenta: eq.precioVenta,
          categoriaId: eq.categoriaId,
          unidadId: eq.unidadId,
          estado: eq.estado,
        }

        if (codigosExistentes.includes(eq.codigo)) {
          duplicados.push({ ...payload, id: idPorCodigo[eq.codigo] })
        } else {
          nuevos.push(payload)
        }
      }

      setEquiposNuevos(nuevos)
      setEquiposDuplicados(duplicados)

      if (duplicados.length > 0) {
        setMostrarModal(true)
      } else if (nuevos.length > 0) {
        const creados = await Promise.all(nuevos.map(eq => createCatalogoEquipo(recalcularCatalogoEquipo(eq))))
        setEquipos(prev => [...prev, ...creados])
        toast.success('Equipos importados exitosamente.')
      } else {
        toast('No se encontraron nuevos equipos para importar.')
      }
    } catch (err) {
      console.error('❌ Error general al importar:', err)
      toast.error('Error inesperado en la importación.')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const sobrescribirDuplicados = async () => {
    try {
      const nuevos = await Promise.all(
        equiposNuevos.map(eq => createCatalogoEquipo(recalcularCatalogoEquipo(eq)))
      )
      const actualizados = await Promise.all(
        equiposDuplicados.map(eq => {
          const { id, ...data } = eq
          return updateCatalogoEquipo(id, recalcularCatalogoEquipo(data))
        })
      )

      setEquipos(prev => {
        const actualizadosIds = new Set(actualizados.map(e => e.id))
        const equiposFiltrados = prev.filter(e => !actualizadosIds.has(e.id))
        return [...equiposFiltrados, ...actualizados, ...nuevos]
      })

      toast.success('Equipos sobrescritos exitosamente.')
      setMostrarModal(false)
    } catch (err) {
      console.error('❌ Error al sobrescribir duplicados:', err)
      toast.error('Error al sobrescribir duplicados.')
    }
  }

  const cancelarImportacion = () => {
    setMostrarModal(false)
    setEquiposNuevos([])
    setEquiposDuplicados([])
    toast('Importación cancelada.')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
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
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div 
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb Navigation */}
      <motion.nav 
        variants={itemVariants}
        className="flex items-center space-x-2 text-sm text-muted-foreground mb-6"
      >
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/catalogo')}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Catálogo
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Equipos</span>
      </motion.nav>

      {/* Header with Actions */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Equipos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona el inventario completo de equipos técnicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Equipos</p>
                <p className="text-2xl font-bold">{equipos.length}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Equipos Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {equipos.filter(e => e.estado === 'activo').length}
                </p>
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
                  {new Set(equipos.map(e => e.categoriaId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Promedio</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${equipos.length > 0 ? 
                    (equipos.reduce((sum, e) => sum + (e.precioVenta || 0), 0) / equipos.length).toFixed(0) 
                    : '0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* Create Equipment Form */}
      <motion.div variants={itemVariants}>
        <CatalogoEquipoCrearAcordeon onCreated={handleCreated} />
      </motion.div>

      {/* Equipment List */}
      <motion.div variants={itemVariants}>
        {equipos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No hay equipos registrados</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comienza agregando tu primer equipo al catálogo para gestionar tu inventario técnico.
              </p>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar Equipos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CatalogoEquipoList data={equipos} onUpdate={handleUpdated} onDelete={handleDeleted} />
        )}
      </motion.div>

      {/* Loading State for Import */}
      {importando && (
        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Importando datos, por favor espere...
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Error Messages */}
      {errores.length > 0 && (
        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Errores al importar:</p>
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

      {/* Duplicate Equipment Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background p-6 rounded-xl shadow-lg max-w-md w-full mx-4"
          >
            <div className="space-y-4">
              <div className="text-center">
                <div className="p-3 bg-orange-100 rounded-full w-fit mx-auto mb-4">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold">Equipos Duplicados</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Se encontraron códigos ya existentes:
                </p>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <ul className="space-y-1">
                  {equiposDuplicados.map((eq, idx) => (
                    <li key={idx} className="text-sm font-mono">
                      <Badge variant="outline">{eq.codigo}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={sobrescribirDuplicados}
                  className="flex-1"
                >
                  Sobreescribir
                </Button>
                <Button 
                  variant="outline"
                  onClick={cancelarImportacion}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
