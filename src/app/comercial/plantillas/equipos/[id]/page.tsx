'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import PlantillaEquipoIndependienteMultiAddModal from '@/components/plantillas/equipos/PlantillaEquipoIndependienteMultiAddModal'
import PlantillaEquiposView from '@/components/plantillas/equipos/PlantillaEquiposView'
import PlantillaEquipoEditModal from '@/components/plantillas/equipos/PlantillaEquipoEditModal'
import { useEquipmentPermissions } from '@/hooks/usePermissions'

import {
  Plus,
  AlertCircle,
  Package,
  Edit,
  ArrowLeft,
  Download,
  TrendingUp
} from 'lucide-react'

// Types
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
  plantillaEquipoItemIndependiente: PlantillaEquipoItemIndependiente[]
  _count?: { plantillaEquipoItemIndependiente: number }
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

// Format currency helper
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="border rounded-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PlantillaEquiposIndependientePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [plantilla, setPlantilla] = useState<PlantillaEquipoIndependiente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [id, setId] = useState<string>('')
  const [showMultiAddModal, setShowMultiAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const { canEdit } = useEquipmentPermissions()

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params
      setId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (id) loadPlantilla()
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

  // Stats memoized
  const stats = useMemo(() => {
    if (!plantilla) return { items: 0, totalInterno: 0, totalCliente: 0, margen: 0, margenPct: 0 }
    const items = plantilla.plantillaEquipoItemIndependiente?.length || 0
    const margen = plantilla.totalCliente - plantilla.totalInterno
    const margenPct = plantilla.totalInterno > 0 ? (margen / plantilla.totalInterno) * 100 : 0
    return {
      items,
      totalInterno: plantilla.totalInterno,
      totalCliente: plantilla.totalCliente,
      margen,
      margenPct
    }
  }, [plantilla])

  const handleMultipleItemsCreated = (items: PlantillaEquipoItemIndependiente[]) => {
    items.forEach(item => {
      setPlantilla(prev => prev ? {
        ...prev,
        plantillaEquipoItemIndependiente: [...(prev.plantillaEquipoItemIndependiente || []), item],
        totalInterno: (prev.totalInterno || 0) + (item.cantidad * item.precioInterno),
        totalCliente: (prev.totalCliente || 0) + (item.cantidad * item.precioCliente),
        grandTotal: (prev.grandTotal || 0) + (item.cantidad * item.precioCliente)
      } : null)
    })
    setShowMultiAddModal(false)
  }

  const handlePlantillaUpdated = (updatedPlantilla: PlantillaEquipoIndependiente) => {
    setPlantilla(updatedPlantilla)
    setShowEditModal(false)
  }

  const handleItemUpdated = (itemId: string, updates: Partial<PlantillaEquipoItemIndependiente>) => {
    setPlantilla(prev => {
      if (!prev) return prev
      const updatedItems = prev.plantillaEquipoItemIndependiente?.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ) || []
      const totalInterno = updatedItems.reduce((sum, item) => sum + item.costoInterno, 0)
      const totalCliente = updatedItems.reduce((sum, item) => sum + item.costoCliente, 0)
      return {
        ...prev,
        plantillaEquipoItemIndependiente: updatedItems,
        totalInterno,
        totalCliente,
        grandTotal: totalCliente - (prev.descuento || 0)
      }
    })
  }

  if (loading) return <LoadingSkeleton />

  if (error || !plantilla) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <h3 className="text-base font-medium text-gray-900 mb-1">Error</h3>
        <p className="text-sm text-muted-foreground mb-4">{error || 'Plantilla no encontrada'}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header minimalista */}
      <div className="space-y-2">
        {/* Breadcrumb compacto */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/comercial/plantillas" className="hover:text-foreground transition-colors inline-flex items-center">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Plantillas
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Equipos</span>
        </nav>

        {/* Título + Acciones */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <h1 className="text-lg font-semibold truncate">{plantilla.nombre}</h1>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {stats.items} items
              </Badge>
            </div>

            {/* Stats inline */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>Interno: <span className="font-mono text-gray-700">{formatCurrency(stats.totalInterno)}</span></span>
              <span className="text-gray-300">|</span>
              <span>Cliente: <span className="font-mono text-green-600 font-medium">{formatCurrency(stats.totalCliente)}</span></span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                Margen: <span className={`font-mono font-medium ${stats.margen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.margen)} ({stats.margenPct.toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="h-8"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Exportar
            </Button>
            <Button
              size="sm"
              onClick={() => setShowMultiAddModal(true)}
              className="h-8 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de equipos - El foco principal */}
      <PlantillaEquiposView
        items={plantilla.plantillaEquipoItemIndependiente || []}
        plantillaId={id}
        onDeleteItem={(itemId) => {
          setPlantilla(prev => prev ? {
            ...prev,
            plantillaEquipoItemIndependiente: prev.plantillaEquipoItemIndependiente?.filter(item => item.id !== itemId) || []
          } : null)
        }}
        onRefresh={loadPlantilla}
        onUpdateItem={handleItemUpdated}
      />

      {/* Modals */}
      <PlantillaEquipoIndependienteMultiAddModal
        isOpen={showMultiAddModal}
        onClose={() => setShowMultiAddModal(false)}
        plantillaId={id}
        onItemsCreated={handleMultipleItemsCreated}
      />

      <PlantillaEquipoEditModal
        plantilla={plantilla}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdated={handlePlantillaUpdated}
      />
    </div>
  )
}
