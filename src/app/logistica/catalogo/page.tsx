'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import LogisticaCatalogoEquipoCrearAcordeon from '@/components/logistica/LogisticaCatalogoEquipoCrearAcordeon'
import LogisticaCatalogoEquipoList from '@/components/logistica/LogisticaCatalogoEquipoList'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { exportarEquiposAExcel, importarEquiposDesdeExcel } from '@/lib/utils/equiposExcel'
import { importarEquiposDesdeExcelValidado } from '@/lib/utils/equiposImportUtils'
import { recalcularCatalogoEquipo } from '@/lib/utils/recalculoCatalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import {
  createEquipoLogistica,
  updateEquipoLogistica,
  getCatalogoEquiposLogistica,
  deleteEquipoLogistica,
} from '@/lib/services/logisticaCatalogoEquipo'
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
  Loader2,
  Truck,
  Warehouse
} from 'lucide-react'

type CatalogoEquipoConId = CatalogoEquipoPayload & { id: string }

export default function LogisticaCatalogoPage() {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [equiposNuevos, setEquiposNuevos] = useState<CatalogoEquipoPayload[]>([])
  const [equiposDuplicados, setEquiposDuplicados] = useState<CatalogoEquipoConId[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const router = useRouter()

  const cargarEquipos = async () => {
    try {
      setLoading(true)
      const data = await getCatalogoEquiposLogistica()
      setEquipos(data)
    } catch (err) {
      console.error('❌ Error al cargar equipos (Logística):', err)
      toast.error('Error al cargar equipos.')
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas
  const stats = {
    total: equipos.length,
    activos: equipos.filter(eq => eq.estado === 'Activo').length,
    pendientes: equipos.filter(eq => eq.estado === 'Pendiente').length,
    valorTotal: equipos.reduce((sum, eq) => sum + (eq.precioInterno || 0), 0)
  }

  useEffect(() => {
    cargarEquipos()
  }, [])

  const handleCreated = async (data: CatalogoEquipoPayload) => {
    const result = await createEquipoLogistica(data)
    if (result) {
      toast.success('Equipo creado exitosamente.')
      cargarEquipos()
    }
  }

  const handleUpdated = async (id: string, data: Partial<CatalogoEquipoPayload>) => {
    const result = await updateEquipoLogistica(id, data)
    if (result) {
      toast.success('Equipo actualizado exitosamente.')
      cargarEquipos()
    }
  }

  const handleDeleted = async (id: string) => {
    const success = await deleteEquipoLogistica(id)
    if (success) {
      toast.success('Equipo eliminado.')
      cargarEquipos()
    }
  }

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
        getCatalogoEquiposLogistica(),
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
          precioLista: eq.precioLista,
          precioInterno: eq.precioInterno,
          factorCosto: eq.factorCosto,
          factorVenta: eq.factorVenta,
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
        const creados = (await Promise.all(
          nuevos.map(eq => createEquipoLogistica(recalcularCatalogoEquipo(eq)))
        )).filter((item): item is CatalogoEquipo => item !== null)

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
      const nuevos = (await Promise.all(
        equiposNuevos.map(eq => createEquipoLogistica(recalcularCatalogoEquipo(eq)))
      )).filter((item): item is CatalogoEquipo => item !== null)

      const actualizados = (await Promise.all(
        equiposDuplicados.map(eq => {
          const { id, ...data } = eq
          return updateEquipoLogistica(id, recalcularCatalogoEquipo(data))
        })
      )).filter((item): item is CatalogoEquipo => item !== null)

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-sm text-muted-foreground"
        >
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard')}
            className="hover:text-primary"
          >
            Dashboard
          </Button>
          <ChevronRight className="h-4 w-4" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/logistica')}
            className="hover:text-primary"
          >
            Logística
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Catálogo de Equipos</span>
        </motion.nav>

        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Catálogo de Equipos</h1>
                <p className="text-muted-foreground">Gestión especializada para logística</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/catalogo/equipos')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Catálogo Completo
            </Button>
            <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Equipos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Equipos Activos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activos}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${stats.valorTotal.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Warehouse className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Create Equipment Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <LogisticaCatalogoEquipoCrearAcordeon onCreated={handleCreated} />
        </motion.div>

        {/* Equipment List Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {loading ? (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <CardTitle>Cargando equipos...</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : equipos.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No hay equipos registrados</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primer equipo al catálogo de logística
                </p>
                <Button onClick={() => (document.querySelector('[data-state="closed"]') as HTMLElement)?.click()}>
                  <Package className="h-4 w-4 mr-2" />
                  Agregar Primer Equipo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Lista de Equipos ({equipos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LogisticaCatalogoEquipoList
                  data={equipos}
                  onUpdate={handleUpdated}
                  onDelete={handleDeleted}
                />
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Import Status */}
        {importando && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Errores al importar:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {errores.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Modal de Duplicados */}
        {mostrarModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-6 rounded-xl shadow-xl space-y-4 w-full max-w-md mx-4"
            >
              <div className="text-center space-y-2">
                <div className="p-3 bg-amber-100 rounded-full w-fit mx-auto">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold">Equipos Duplicados</h2>
                <p className="text-sm text-muted-foreground">
                  Se encontraron códigos ya existentes:
                </p>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {equiposDuplicados.map((eq, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{eq.codigo}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={sobrescribirDuplicados}
                  className="flex-1"
                >
                  Sobreescribir
                </Button>
                <Button
                  onClick={cancelarImportacion}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
