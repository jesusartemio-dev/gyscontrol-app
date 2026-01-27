'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target,
  DollarSign,
  TrendingUp,
  BarChart3,
  Loader2,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OportunidadesList, OportunidadForm } from '@/components/crm'
import { CrmOportunidad } from '@/lib/services/crm'
import { getClientes } from '@/lib/services/cliente'
import { getUsuarios } from '@/lib/services/usuario'
import CrearCotizacionDesdeOportunidadModal from '@/components/crm/CrearCotizacionDesdeOportunidadModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

// ✅ Tipos para datos reales
interface Cliente {
  id: string
  nombre: string
  ruc?: string
  sector?: string
}

interface Usuario {
  id: string
  name: string
  email: string
}

interface DashboardData {
  metricasGenerales: {
    totalOportunidades: number
    oportunidadesActivas: number
    oportunidadesGanadas: number
    oportunidadesPerdidas: number
    valorTotalPipeline: number
    tasaConversion: number
  }
  oportunidadesPorEstado: Array<{
    estado: string
    count: number
    valor: number
  }>
  actividadesRecientes: Array<{
    id: string
    tipo: string
    descripcion: string
    fecha: string
    resultado?: string
    usuario?: {
      id: string
      name: string
    }
    oportunidad?: {
      id: string
      nombre: string
      cliente?: {
        id: string
        nombre: string
      }
    }
  }>
  chartData: {
    pipeline: Array<{
      name: string
      value: number
      valor: number
    }>
    tendencias: Array<{
      mes: string
      oportunidades: number
      valor: number
    }>
  }
}

export default function CrmDashboardPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingOportunidad, setEditingOportunidad] = useState<CrmOportunidad | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [showCotizacionModal, setShowCotizacionModal] = useState(false)
  const [selectedOportunidad, setSelectedOportunidad] = useState<CrmOportunidad | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    oportunidad: CrmOportunidad | null
  }>({ open: false, oportunidad: null })

  // ✅ Cargar datos del dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoadingData(true)

        // Cargar datos del dashboard
        const response = await fetch('/api/crm/dashboard')
        if (response.ok) {
          const data = await response.json()
          setDashboardData(data)
        }

        // Cargar clientes y usuarios para el formulario
        const [clientesData, usuariosData] = await Promise.all([
          getClientes(),
          getUsuarios()
        ])

        setClientes(clientesData)
        setUsuarios(usuariosData)

      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadDashboardData()
  }, [])

  // ✅ Manejar creación de nueva oportunidad
  const handleCreateOportunidad = () => {
    setEditingOportunidad(null)
    setShowForm(true)
  }

  // ✅ Manejar edición de oportunidad
  const handleEditOportunidad = (oportunidad: CrmOportunidad) => {
    setEditingOportunidad(oportunidad)
    setShowForm(true)
  }

  // ✅ Manejar eliminación de oportunidad
  const handleDeleteOportunidad = (oportunidad: CrmOportunidad) => {
    setDeleteConfirm({ open: true, oportunidad })
  }

  // ✅ Ejecutar eliminación de oportunidad
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.oportunidad) return

    try {
      const response = await fetch(`/api/crm/oportunidades/${deleteConfirm.oportunidad.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar oportunidad')
      }

      toast.success('Oportunidad eliminada exitosamente')
      setRefreshKey(prev => prev + 1) // Forzar recarga de la lista
      setDeleteConfirm({ open: false, oportunidad: null })
    } catch (error) {
      console.error('Error deleting oportunidad:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar oportunidad')
    }
  }

  // ✅ Cancelar eliminación
  const handleCancelDelete = () => {
    setDeleteConfirm({ open: false, oportunidad: null })
  }

  // ✅ Manejar éxito del formulario
  const handleFormSuccess = (oportunidad: CrmOportunidad) => {
    setRefreshKey(prev => prev + 1) // Forzar recarga de la lista
    setShowForm(false)
    setEditingOportunidad(null)
    // No recargar toda la página, solo actualizar la lista localmente
  }

  // ✅ Manejar visualización de oportunidad
  const handleViewOportunidad = (oportunidad: CrmOportunidad) => {
    router.push(`/crm/${oportunidad.id}`)
  }

  // ✅ Manejar creación de cotización desde oportunidad
  const handleCreateCotizacion = (oportunidad: CrmOportunidad) => {
    setSelectedOportunidad(oportunidad)
    setShowCotizacionModal(true)
  }

  // ✅ Manejar éxito de creación de cotización
  const handleCotizacionSuccess = (cotizacion: any) => {
    setRefreshKey(prev => prev + 1) // Forzar recarga de la lista
    setShowCotizacionModal(false)
    setSelectedOportunidad(null)
    // Navegar a la nueva cotización sin recargar toda la página
    router.push(`/comercial/cotizaciones/${cotizacion.id}`)
  }

  // Mostrar loading mientras se cargan los datos
  if (loadingData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando datos del CRM...</p>
          </div>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'inicio':
      case 'prospecto': return 'secondary'
      case 'contacto_cliente':
      case 'contacto_inicial': return 'outline'
      case 'validacion_tecnica': return 'outline'
      case 'consolidacion_precios': return 'outline'
      case 'validacion_comercial': return 'outline'
      case 'seguimiento_cliente':
      case 'cotizacion': return 'default'
      case 'negociacion': return 'warning'
      case 'seguimiento_proyecto': return 'default'
      case 'cerrada_ganada': return 'default'
      case 'cerrada_perdida': return 'destructive'
      default: return 'outline'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'inicio':
      case 'prospecto': return 'Inicio'
      case 'contacto_cliente':
      case 'contacto_inicial': return 'Contacto Cliente'
      case 'validacion_tecnica': return 'V. Técnica'
      case 'consolidacion_precios': return 'C. Precios'
      case 'validacion_comercial': return 'V. Comercial'
      case 'seguimiento_cliente':
      case 'cotizacion': return 'Seguimiento'
      case 'negociacion': return 'Negociación'
      case 'seguimiento_proyecto': return 'Proyecto'
      case 'cerrada_ganada': return 'Ganada'
      case 'cerrada_perdida': return 'Perdida'
      default: return estado
    }
  }

  return (
    <div className="p-4 space-y-4 overflow-hidden">
        {/* Header Minimalista */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Oportunidades</h1>
            <p className="text-gray-600 text-sm">Gestión comercial</p>
          </div>

          <Button onClick={handleCreateOportunidad} size="sm">
            <Target className="h-4 w-4 mr-2" />
            Nueva Oportunidad
          </Button>
        </div>

      {/* Lista de Oportunidades como foco principal */}
      <OportunidadesList
        key={refreshKey}
        onView={handleViewOportunidad}
        onEdit={handleEditOportunidad}
        onDelete={handleDeleteOportunidad}
        onCreate={handleCreateOportunidad}
        onCreateCotizacion={handleCreateCotizacion}
      />

      {/* Formulario Modal */}
      <OportunidadForm
        open={showForm}
        onOpenChange={setShowForm}
        oportunidad={editingOportunidad}
        onSuccess={handleFormSuccess}
        clientes={clientes}
        usuarios={usuarios}
      />

      {/* Modal para crear cotización desde oportunidad */}
      {selectedOportunidad && showCotizacionModal && (
        <CrearCotizacionDesdeOportunidadModal
          oportunidad={selectedOportunidad!}
          onSuccess={(cotizacionId) => {
            handleCotizacionSuccess({ id: cotizacionId })
          }}
          onClose={() => {
            setShowCotizacionModal(false)
            setSelectedOportunidad(null)
          }}
        />
      )}

      {/* 🗑️ Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && handleCancelDelete()}
        title="¿Eliminar oportunidad?"
        description={
          deleteConfirm.oportunidad
            ? `¿Estás seguro de que quieres eliminar la oportunidad "${deleteConfirm.oportunidad.nombre}"? Esta acción no se puede deshacer y eliminará también todas las actividades relacionadas.`
            : "Esta acción no se puede deshacer."
        }
        onConfirm={handleConfirmDelete}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  )
}