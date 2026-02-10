'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Target, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OportunidadesList, OportunidadForm } from '@/components/crm'
import { CrmOportunidad } from '@/lib/services/crm'
import { getClientes } from '@/lib/services/cliente'
import { getUsuarios } from '@/lib/services/usuario'
import CrearCotizacionDesdeOportunidadModal from '@/components/crm/CrearCotizacionDesdeOportunidadModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

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

export default function OportunidadesPage() {
  const router = useRouter()
  const { status } = useSession()
  const [showForm, setShowForm] = useState(false)
  const [editingOportunidad, setEditingOportunidad] = useState<CrmOportunidad | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showCotizacionModal, setShowCotizacionModal] = useState(false)
  const [selectedOportunidad, setSelectedOportunidad] = useState<CrmOportunidad | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    oportunidad: CrmOportunidad | null
  }>({ open: false, oportunidad: null })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientesData, usuariosData] = await Promise.all([
          getClientes(),
          getUsuarios()
        ])
        setClientes(clientesData)
        setUsuarios(usuariosData)
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCreateOportunidad = () => {
    setEditingOportunidad(null)
    setShowForm(true)
  }

  const handleEditOportunidad = (oportunidad: CrmOportunidad) => {
    setEditingOportunidad(oportunidad)
    setShowForm(true)
  }

  const handleDeleteOportunidad = (oportunidad: CrmOportunidad) => {
    setDeleteConfirm({ open: true, oportunidad })
  }

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
      setRefreshKey(prev => prev + 1)
      setDeleteConfirm({ open: false, oportunidad: null })
    } catch (error) {
      console.error('Error deleting oportunidad:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar oportunidad')
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirm({ open: false, oportunidad: null })
  }

  const handleFormSuccess = () => {
    setRefreshKey(prev => prev + 1)
    setShowForm(false)
    setEditingOportunidad(null)
  }

  const handleViewOportunidad = (oportunidad: CrmOportunidad) => {
    router.push(`/crm/oportunidades/${oportunidad.id}`)
  }

  const handleCreateCotizacion = (oportunidad: CrmOportunidad) => {
    setSelectedOportunidad(oportunidad)
    setShowCotizacionModal(true)
  }

  const handleCotizacionSuccess = (cotizacionId: string) => {
    setRefreshKey(prev => prev + 1)
    setShowCotizacionModal(false)
    setSelectedOportunidad(null)
    router.push(`/comercial/cotizaciones/${cotizacionId}`)
  }

  if (loading || status === 'loading') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  return (
    <div className="p-4 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oportunidades</h1>
          <p className="text-sm text-muted-foreground">Gestión del pipeline comercial</p>
        </div>
        <Button onClick={handleCreateOportunidad} size="sm">
          <Target className="h-4 w-4 mr-2" />
          Nueva Oportunidad
        </Button>
      </div>

      {/* Lista de Oportunidades */}
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

      {/* Modal para crear cotización */}
      {selectedOportunidad && showCotizacionModal && (
        <CrearCotizacionDesdeOportunidadModal
          oportunidad={selectedOportunidad}
          onSuccess={handleCotizacionSuccess}
          onClose={() => {
            setShowCotizacionModal(false)
            setSelectedOportunidad(null)
          }}
        />
      )}

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && handleCancelDelete()}
        title="¿Eliminar oportunidad?"
        description={
          deleteConfirm.oportunidad
            ? `¿Estás seguro de que quieres eliminar la oportunidad "${deleteConfirm.oportunidad.nombre}"? Esta acción no se puede deshacer.`
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
