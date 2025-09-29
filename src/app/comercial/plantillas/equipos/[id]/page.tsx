'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import PlantillaEquipoIndependienteMultiAddModal from '@/components/plantillas/equipos/PlantillaEquipoIndependienteMultiAddModal'
import PlantillaEquiposView from '@/components/plantillas/equipos/PlantillaEquiposView'
import PlantillaEquipoEditModal from '@/components/plantillas/equipos/PlantillaEquipoEditModal'
import { useEquipmentPermissions } from '@/hooks/usePermissions'

import {
  Plus,
  ChevronRight,
  Share2,
  Download,
  AlertCircle,
  Loader2,
  Wrench,
  DollarSign,
  Edit
} from 'lucide-react'

// Types for independent equipment templates
interface PlantillaEquipoIndependiente {
  id: string
  nombre: string
  descripcion?: string
  estado: string
  totalInterno: number
  totalCliente: number
  descuento: number
  grandTotal: number
  createdAt: string
  updatedAt: string
  items: PlantillaEquipoItemIndependiente[]
  _count?: { items: number }
}

interface PlantillaEquipoItemIndependiente {
  id: string
  plantillaEquipoId: string
  catalogoEquipoId?: string
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  precioInterno: number
  precioCliente: number
  cantidad: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
  catalogoEquipo?: {
    id: string
    codigo: string
    descripcion: string
    marca: string
    precioVenta: number
  }
}


// Animation variants
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
  visible: { opacity: 1, y: 0 }
}

// Format currency helper
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}


export default function PlantillaEquiposIndependientePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [plantilla, setPlantilla] = useState<PlantillaEquipoIndependiente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [id, setId] = useState<string>('')
  const [showMultiAddModal, setShowMultiAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Check permissions for editing
  const { canEdit, loading: permissionsLoading } = useEquipmentPermissions()

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params
      setId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (id) {
      loadPlantilla()
    }
  }, [id])

  const loadPlantilla = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/plantillas/equipos/${id}`)
      if (!response.ok) throw new Error('Error al cargar plantilla')
      const data = await response.json()
      setPlantilla(data)
    } catch (err) {
      console.error('Error loading plantilla:', err)
      setError('Error al cargar la plantilla')
    } finally {
      setLoading(false)
    }
  }



  // ✅ Handle multiple items creation
  const handleMultipleItemsCreated = (items: PlantillaEquipoItemIndependiente[]) => {
    items.forEach(item => {
      // Update the plantilla state to include new items
      setPlantilla(prev => prev ? {
        ...prev,
        items: [...(prev.items || []), item],
        totalInterno: (prev.totalInterno || 0) + (item.cantidad * item.precioInterno),
        totalCliente: (prev.totalCliente || 0) + (item.cantidad * item.precioCliente),
        grandTotal: (prev.grandTotal || 0) + (item.cantidad * item.precioCliente)
      } : null)
    })
    setShowMultiAddModal(false)
  }

  // Handle plantilla update
  const handlePlantillaUpdated = (updatedPlantilla: PlantillaEquipoIndependiente) => {
    setPlantilla(updatedPlantilla)
    setShowEditModal(false)
  }

  // Handle item update (optimistic update)
  const handleItemUpdated = (itemId: string, updates: Partial<PlantillaEquipoItemIndependiente>) => {
    setPlantilla(prev => {
      if (!prev) return prev

      const updatedItems = prev.items?.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ) || []

      // Recalculate totals
      const totalInterno = updatedItems.reduce((sum, item) => sum + item.costoInterno, 0)
      const totalCliente = updatedItems.reduce((sum, item) => sum + item.costoCliente, 0)
      const grandTotal = totalCliente - (prev.descuento || 0)

      return {
        ...prev,
        items: updatedItems,
        totalInterno,
        totalCliente,
        grandTotal
      }
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando plantilla...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !plantilla) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold text-red-600">Error</h3>
            <p className="text-muted-foreground">{error || 'Plantilla no encontrada'}</p>
            <Button onClick={() => router.back()}>
              Volver
            </Button>
          </div>
        </div>
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
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/comercial')}
            className="p-0 h-auto font-normal"
          >
            Comercial
          </Button>
          <ChevronRight className="h-4 w-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/comercial/plantillas')}
            className="p-0 h-auto font-normal"
          >
            Plantillas
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Equipos</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wrench className="h-6 w-6 text-orange-600" />
              <h1 className="text-2xl font-bold tracking-tight">{plantilla.nombre}</h1>
            </div>
            <p className="text-muted-foreground">
              Plantilla independiente especializada en equipos y maquinaria
            </p>
          </div>

          <div className="flex gap-2">
            {canEdit && (
              <Button variant="default" size="sm" onClick={() => setShowEditModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Edit className="h-4 w-4 mr-2" />
                Editar Plantilla
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </motion.div>

      <Separator />

      {/* Financial Summary */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Resumen de Costos - Equipos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(plantilla.totalInterno)}
                </div>
                <div className="text-sm text-blue-600">Costo Interno</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(plantilla.totalCliente)}
                </div>
                <div className="text-sm text-green-600">Precio Cliente</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {((plantilla.totalCliente - plantilla.totalInterno) > 0 ?
                    `+${formatCurrency(plantilla.totalCliente - plantilla.totalInterno)}` :
                    formatCurrency(plantilla.totalCliente - plantilla.totalInterno))}
                </div>
                <div className="text-sm text-purple-600">Margen</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Equipment Items Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  Equipos en la Plantilla
                </CardTitle>
                <CardDescription>
                  Lista de equipos incluidos en esta plantilla independiente
                </CardDescription>
              </div>
              <Button onClick={() => setShowMultiAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Equipos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PlantillaEquiposView
              items={plantilla.items || []}
              plantillaId={id}
              onDeleteItem={(itemId) => {
                setPlantilla(prev => prev ? {
                  ...prev,
                  items: prev.items?.filter(item => item.id !== itemId) || []
                } : null)
              }}
              onRefresh={loadPlantilla}
              onUpdateItem={handleItemUpdated}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* ✅ Multi-add modal */}
      <PlantillaEquipoIndependienteMultiAddModal
        isOpen={showMultiAddModal}
        onClose={() => setShowMultiAddModal(false)}
        plantillaId={id}
        onItemsCreated={handleMultipleItemsCreated}
      />

      {/* Edit modal */}
      <PlantillaEquipoEditModal
        plantilla={plantilla}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdated={handlePlantillaUpdated}
      />
    </motion.div>
  )
}