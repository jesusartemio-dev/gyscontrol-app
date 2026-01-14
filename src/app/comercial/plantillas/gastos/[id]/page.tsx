'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import PlantillaGastoIndependienteMultiAddModal from '@/components/plantillas/gastos/PlantillaGastoIndependienteMultiAddModal'
import CrearCotizacionModal from '@/components/cotizaciones/CrearCotizacionModal'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

import {
  Plus,
  ChevronRight,
  Share2,
  Download,
  Edit,
  FileText,
  Settings,
  AlertCircle,
  Loader2,
  DollarSign,
  Package,
  Trash2
} from 'lucide-react'

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

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'activo':
    case 'active':
      return { variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200' }
    case 'inactivo':
    case 'inactive':
      return { variant: 'secondary' as const, className: 'bg-red-100 text-red-800 border-red-200' }
    case 'borrador':
    case 'draft':
      return { variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    case 'pendiente':
    case 'pending':
      return { variant: 'outline' as const, className: 'bg-blue-100 text-blue-800 border-blue-200' }
    case 'archivado':
    case 'archived':
      return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800 border-gray-200' }
    default:
      return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
}

interface PlantillaGastoIndependiente {
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
  plantillaGastoItemIndependiente: PlantillaGastoItemIndependiente[]
}

interface PlantillaGastoItemIndependiente {
  id: string
  plantillaGastoId: string
  nombre: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
}


export default function PlantillaGastosDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [plantilla, setPlantilla] = useState<PlantillaGastoIndependiente | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof id === 'string') {
      loadPlantilla(id)
    }
  }, [id])

  const loadPlantilla = async (plantillaId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/plantillas/gastos/${plantillaId}`)
      if (!response.ok) {
        throw new Error('Error al cargar la plantilla')
      }
      const data = await response.json()
      setPlantilla(data)
    } catch (err) {
      console.error('Error loading plantilla:', err)
      setError('❌ Error al cargar la plantilla.')
    } finally {
      setLoading(false)
    }
  }

  const handleItemsAdded = async (newItems: any[]) => {
    if (!plantilla) return

    try {
      // Recargar la plantilla para obtener los datos actualizados
      await loadPlantilla(plantilla.id)
      toast.success(`Se agregaron ${newItems.length} items a la plantilla`)
    } catch (err) {
      console.error('Error updating plantilla:', err)
      toast.error('Error al actualizar la plantilla')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!plantilla) return

    try {
      const response = await fetch(`/api/plantillas/gastos/${plantilla.id}/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar el item')
      }

      // Recargar la plantilla
      await loadPlantilla(plantilla.id)
      toast.success('Item eliminado de la plantilla')
    } catch (err) {
      console.error('Error deleting item:', err)
      toast.error('Error al eliminar el item')
    }
  }

  // Loading State
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p className="font-semibold">{error}</p>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (!plantilla) {
    return null
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gray-50/50"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with Breadcrumb */}
        <motion.div variants={itemVariants}>
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/comercial/plantillas')}
              className="hover:bg-gray-100"
            >
              Plantillas
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">Plantillas de Gastos</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{plantilla.nombre}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{plantilla.nombre}</h1>
                <Badge
                  variant={getStatusVariant(plantilla.estado).variant}
                  className={getStatusVariant(plantilla.estado).className}
                >
                  {plantilla.estado}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200">
                  <DollarSign className="h-3 w-3" />
                  Gastos - Plantilla
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Plantilla Especializada
                </span>
                <span>Creada: {formatDate(plantilla.createdAt)}</span>
                <span>{plantilla.plantillaGastoItemIndependiente.length} items</span>
                <span>Total: {formatCurrency(plantilla.grandTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Financial Summary */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Resumen de Costos - Gastos
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
                    {plantilla.totalCliente - plantilla.totalInterno > 0 ?
                      `+${formatCurrency(plantilla.totalCliente - plantilla.totalInterno)}` :
                      formatCurrency(plantilla.totalCliente - plantilla.totalInterno)}
                  </div>
                  <div className="text-sm text-purple-600">Margen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* Crear Cotización */}
        <motion.div variants={itemVariants}>
          <div className="flex justify-end mb-6">
            <CrearCotizacionModal
              plantillaId={plantilla.id}
              onSuccess={(cotizacionId) => router.push(`/comercial/cotizaciones/${cotizacionId}`)}
            />
          </div>
        </motion.div>

        {/* Items Section */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    Items de Gastos
                  </CardTitle>
                  <CardDescription>
                    Gastos incluidos en la plantilla ({plantilla.plantillaGastoItemIndependiente.length} items)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Gastos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PlantillaGastoIndependienteMultiAddModal
                plantillaId={plantilla.id}
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onItemsCreated={handleItemsAdded}
              />

              {plantilla.plantillaGastoItemIndependiente.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay items en la plantilla
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comienza agregando gastos a tu plantilla
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primeros Gastos
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {plantilla.plantillaGastoItemIndependiente.map((item, index) => (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">{item.nombre}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{item.descripcion}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Cantidad: {item.cantidad}</span>
                            <span>Precio Unitario: {formatCurrency(item.precioUnitario)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600 mb-1">Precio Cliente</div>
                          <div className="font-semibold text-green-600">
                            {formatCurrency(item.costoCliente)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}