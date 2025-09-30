'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import {
  Plus,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Loader2,
  Grid3X3,
  Table
} from 'lucide-react'

import { CotizacionProveedor, Proyecto, Proveedor } from '@/types'
import {
  getCotizacionesProveedor,
  updateCotizacionProveedor,
  deleteCotizacionProveedor,
} from '@/lib/services/cotizacionProveedor'
import { getProyectos } from '@/lib/services/proyecto'
import { getProveedores } from '@/lib/services/proveedor'

import CotizacionProveedorAccordion from '@/components/logistica/CotizacionProveedorAccordion'
import ModalCrearCotizacionProveedor from '@/components/logistica/ModalCrearCotizacionProveedor'
import ModalCrearCotizacionCompleta from '@/components/logistica/ModalCrearCotizacionCompleta'
import CotizacionesProveedorTableView from '@/components/logistica/CotizacionesProveedorTableView'
import CotizacionesProveedorCardView from '@/components/logistica/CotizacionesProveedorCardView'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function CotizacionesPage() {
  const { data: session } = useSession()
  const [cotizaciones, setCotizaciones] = useState<CotizacionProveedor[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [openModalCompleta, setOpenModalCompleta] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  const cargarCotizaciones = async () => {
    try {
      setLoading(true)
      const data = await getCotizacionesProveedor()
      setCotizaciones(data || [])
    } catch {
      toast.error('Error al cargar cotizaciones')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Nueva función para actualización local más eficiente
  const handleCotizacionUpdated = async (cotizacionId: string) => {
    try {
      // Solo refetch la cotización específica, no toda la lista
      const { getCotizacionProveedorById } = await import('@/lib/services/cotizacionProveedor')
      const updatedCotizacion = await getCotizacionProveedorById(cotizacionId)
      
      if (updatedCotizacion) {
        setCotizaciones(prev => 
          prev.map(cot => 
            cot.id === cotizacionId ? updatedCotizacion : cot
          )
        )
      }
    } catch (error) {
      console.error('Error al actualizar cotización específica:', error)
      // Fallback: recargar toda la lista solo si falla la actualización local
      await cargarCotizaciones()
    }
  }

  // ✅ Nueva función para actualización local de estado sin refetch
  const handleEstadoUpdated = async (cotizacionId: string, nuevoEstado: CotizacionProveedor['estado']) => {
    try {
      // Buscar la cotización para obtener el estado anterior
      const cotizacion = cotizaciones.find(c => c.id === cotizacionId);
      const estadoAnterior = cotizacion?.estado;

      // Actualizar estado local inmediatamente
      setCotizaciones(prev =>
        prev.map(cot =>
          cot.id === cotizacionId ? { ...cot, estado: nuevoEstado } : cot
        )
      );

      // Llamar al servicio para persistir el cambio
      await updateCotizacionProveedor(cotizacionId, { estado: nuevoEstado });

      // ✅ Registrar auditoría del cambio de estado
      if (estadoAnterior && estadoAnterior !== nuevoEstado) {
        try {
          const { logStatusChange } = await import('@/lib/services/auditLogger');
          await logStatusChange({
            userId: (session?.user as any)?.id || '',
            entityType: 'COTIZACION',
            entityId: cotizacionId,
            oldStatus: estadoAnterior,
            newStatus: nuevoEstado,
            description: cotizacion?.codigo || `Cotización ${cotizacionId}`
          });
        } catch (auditError) {
          console.warn('Error al registrar auditoría:', auditError);
          // No fallar la operación por error de auditoría
        }
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      // Revertir cambio local en caso de error
      setCotizaciones(prev =>
        prev.map(cot => {
          if (cot.id === cotizacionId) {
            // Buscar el estado original
            const originalCotizacion = cotizaciones.find(c => c.id === cotizacionId);
            return originalCotizacion ? { ...cot, estado: originalCotizacion.estado } : cot;
          }
          return cot;
        })
      );
      throw error; // Re-throw para que el componente maneje el error
    }
  };

  const cargarDatosIniciales = async () => {
    try {
      const [proyectosData, proveedoresData] = await Promise.all([
        getProyectos(),
        getProveedores(),
      ])
      setProyectos(proyectosData)
      setProveedores(proveedoresData)
    } catch {
      toast.error('Error al cargar proyectos o proveedores')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        cargarCotizaciones(),
        cargarDatosIniciales()
      ])
    }
    loadData()
  }, [])

  const handleUpdate = async (id: string, payload: any) => {
    try {
      setLoadingAction(true)
      const actualizado = await updateCotizacionProveedor(id, payload)
      if (actualizado) {
        toast.success('✅ Cotización actualizada')
        await cargarCotizaciones()
      } else {
        toast.error('❌ Error al actualizar cotización')
      }
    } catch {
      toast.error('❌ Error al actualizar cotización')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setLoadingAction(true)
      const ok = await deleteCotizacionProveedor(id)
      if (ok) {
        toast.success('🗑️ Cotización eliminada')
        await cargarCotizaciones()
      } else {
        toast.error('❌ Error al eliminar cotización')
      }
    } catch {
      toast.error('❌ Error al eliminar cotización')
    } finally {
      setLoadingAction(false)
    }
  }

  // Función para obtener estadísticas
  const getEstadisticas = () => {
    const total = cotizaciones.length
    const pendientes = cotizaciones.filter(c => c.estado === 'pendiente').length
    const cotizados = cotizaciones.filter(c => c.estado === 'cotizado').length
    const seleccionados = cotizaciones.filter(c => c.estado === 'seleccionado').length
    
    return { total, pendientes, cotizados, seleccionados }
  }

  const estadisticas = getEstadisticas()

  // ✅ Wrapper functions for table/card views
  const handleEditCotizacion = (cotizacion: CotizacionProveedor) => {
    // For now, just show a placeholder - could open edit modal
    console.log('Edit cotizacion:', cotizacion);
  }

  const handleDeleteCotizacion = async (cotizacion: CotizacionProveedor) => {
    await handleDelete(cotizacion.id);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-80 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-60 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 border rounded-lg">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 border rounded-lg">
              <div className="h-6 w-full bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Section */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-600" />
              Cotizaciones de Proveedores
            </h1>
            <p className="text-gray-600">
              Gestiona y supervisa todas las cotizaciones de proveedores
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8"
              >
                <Table className="h-4 w-4 mr-2" />
                Tabla
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="h-8"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Cards
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setOpenModalCompleta(true)}
                disabled={loadingAction}
                className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loadingAction ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Cotización
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setOpenModal(true)}
                disabled={loadingAction}
                className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Cotización Rápida
              </Button>
            </div>
          </div>
        </div>

        <Separator />
      </motion.div>

      {/* Statistics Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Cotizaciones
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{estadisticas.total}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{estadisticas.pendientes}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cotizados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{estadisticas.cotizados}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Seleccionados
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estadisticas.seleccionados}</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content Section */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {cotizaciones.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {viewMode === 'table' ? (
              <CotizacionesProveedorTableView
                cotizaciones={cotizaciones}
                onEdit={handleEditCotizacion}
                onDelete={handleDeleteCotizacion}
              />
            ) : (
              <CotizacionesProveedorCardView
                cotizaciones={cotizaciones}
                onEdit={handleEditCotizacion}
                onDelete={handleDeleteCotizacion}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    No hay cotizaciones registradas
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    Comienza creando tu primera cotización de proveedor para gestionar tus solicitudes de manera eficiente.
                  </p>
                </div>
                <Button
                  onClick={() => setOpenModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Cotización
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Modal para crear cotización rápida */}
      <ModalCrearCotizacionProveedor
        open={openModal}
        onClose={() => setOpenModal(false)}
        proyectos={proyectos}
        proveedores={proveedores}
        onCreated={cargarCotizaciones}
      />

      {/* Modal para crear cotización completa */}
      <ModalCrearCotizacionCompleta
        open={openModalCompleta}
        onClose={() => setOpenModalCompleta(false)}
        proyectos={proyectos}
        proveedores={proveedores}
        onCreated={cargarCotizaciones}
      />
    </motion.div>
  )
}
