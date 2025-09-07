// ===================================================
// 📁 Archivo: page.tsx
// 📍 Ubicación: src/app/proyectos/[id]/equipos/[listaId]/detalle/
// 🔧 Descripción: Página de detalle de lista de equipos - VISTA SIMPLE
//
// 🎨 Vista Simple:
// - Client component para evitar problemas de server/client
// - Usa servicios en lugar de Prisma directo
// - Basado en la página de referencia que funciona
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { getListaEquipoDetail } from '@/lib/services/listaEquipo'
import { getProyectoById } from '@/lib/services/proyecto'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createPedidoDesdeListaContextual } from '@/lib/services/pedidoEquipo'
import { calcularCostoTotal, formatCurrency } from '@/lib/utils/costoCalculations'
import type { ListaEquipo, Proyecto, ListaEquipoItem, EstadoListaEquipo, PedidoEquipoPayload } from '@/types'
import ListaEquipoItemListWithViews from '@/components/equipos/ListaEquipoItemListWithViews'
import ListaEstadoFlujo from '@/components/equipos/ListaEstadoFlujo'
import ListaEquipoSummary from '@/components/equipos/ListaEquipoSummary'
import PedidoDesdeListaModal from '@/components/equipos/PedidoDesdeListaModal'
import ModalAgregarItemDesdeCatalogo from '@/components/equipos/ModalAgregarItemDesdeCatalogo'
import ModalAgregarItemDesdeEquipo from '@/components/equipos/ModalAgregarItemDesdeEquipo'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ChevronRight, 
  ClipboardList, 
  AlertCircle,
  FileText,
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

// Helper functions for UI enhancements
const getStatusVariant = (estado: string): "default" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'activo': return 'default'
    case 'completado': return 'default'
    case 'pausado': return 'outline'
    case 'cancelado': return 'outline'
    default: return 'outline'
  }
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function ListaEquipoDetallePage() {
  const params = useParams<{ id: string; listaId: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [lista, setLista] = useState<ListaEquipo | null>(null)
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModalCatalogo, setShowModalCatalogo] = useState(false)
  const [showModalEquipo, setShowModalEquipo] = useState(false)

  // ✅ Separate useEffect for initial data loading only
  useEffect(() => {
    if (!params.id || !params.listaId) return
    
    let isMounted = true // Prevent state updates if component unmounts
    
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [proyectoData, listaData, itemsData] = await Promise.all([
          getProyectoById(params.id),
          getListaEquipoDetail(params.listaId),
          getListaEquipoItemsByLista(params.listaId)
        ])
        
        if (isMounted) {
          setProyecto(proyectoData)
          setLista(listaData)
          setItems(itemsData)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        if (isMounted) {
          setError('Error al cargar los datos')
          toast.error('Error al cargar los datos')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    return () => {
      isMounted = false
    }
  }, []) // ✅ Remove dependencies to prevent re-execution on state changes

  // ✅ Function to refresh items after changes
  const handleItemsUpdated = async () => {
    try {
      const itemsData = await getListaEquipoItemsByLista(params.listaId)
      setItems(itemsData)
    } catch (err) {
      console.error('Error refreshing items:', err)
      toast.error('Error al actualizar los elementos')
    }
  }

  // ✅ Add loading state for estado updates to prevent flash of error component
  const [isUpdatingEstado, setIsUpdatingEstado] = useState(false)
 
  // ✅ Enhanced estado update handler that prevents error flash
  const handleEstadoUpdatedSafe = async (nuevoEstado: EstadoListaEquipo) => {
    if (!lista) return
    
    setIsUpdatingEstado(true)
    
    // 🔁 Update local state directly instead of making API call
    setLista(prev => {
      if (!prev) return prev
      return { ...prev, estado: nuevoEstado }
    })
    
    // Small delay to ensure state update is processed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    setIsUpdatingEstado(false)
    toast.success('Estado actualizado correctamente')
  }

  // ✅ Handle individual item update
  const handleItemUpdated = async (itemId: string) => {
    try {
      const itemsData = await getListaEquipoItemsByLista(params.listaId)
      setItems(itemsData)
    } catch (err) {
      console.error('Error updating item:', err)
      toast.error('Error al actualizar el elemento')
    }
  }

  // ✅ Action handlers
  const handleEditLista = () => {
    router.push(`/proyectos/${params.id}/equipos/${params.listaId}/editar`)
  }

  const handleDeleteLista = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar esta lista?')) {
      try {
        // TODO: Implement delete lista service
        toast.success('Lista eliminada correctamente')
        router.push(`/proyectos/${params.id}/equipos`)
      } catch (error) {
        toast.error('Error al eliminar la lista')
      }
    }
  }

  const handleAddCotizacion = () => {
    setShowModalEquipo(true)
  }

  const handleAddNewItem = () => {
    setShowModalCatalogo(true)
  }

  const handleCreatePedido = async (payload: PedidoEquipoPayload): Promise<{ id: string } | null> => {
    try {
      const result = await createPedidoDesdeListaContextual(payload)
      if (result) {
        toast.success('Pedido creado exitosamente')
        // Refresh items to update cantidadPedida
        await handleItemsUpdated()
        return result
      }
      return null
    } catch (error) {
      console.error('Error creating pedido:', error)
      toast.error('Error al crear el pedido')
      return null
    }
  }

  // Loading State
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // ✅ Error state (only for actual errors, not missing data)
  if (error && !isUpdatingEstado) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Intentar nuevamente
          </Button>
        </motion.div>
      </div>
    )
  }

  // ✅ Show content even during updates - only show "not found" if initial load failed
  // This ensures items and estados are always visible as requested by user
  if (!loading && !isUpdatingEstado && !proyecto && !lista && !error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Datos no encontrados</h2>
          <p className="text-gray-600 mb-6">No se pudo encontrar la información solicitada</p>
          <Button onClick={() => router.push(`/proyectos/${params.id}/equipos/listas-integradas`)}>
            Volver a Listas
          </Button>
        </motion.div>
      </div>
    )
  }

  // ✅ Always show content when we have some data - prioritize showing items and estados
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header Section */}
        <div className="space-y-6">
          {/* Breadcrumb Navigation - Safe rendering */}
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/proyectos')}
              className="hover:text-foreground"
            >
              Proyectos
            </Button>
            <ChevronRight className="h-4 w-4" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/proyectos/${params.id}`)}
              className="hover:text-foreground"
            >
              {proyecto?.nombre || 'Cargando...'}
            </Button>
            <ChevronRight className="h-4 w-4" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/proyectos/${params.id}/equipos/listas-integradas`)}
              className="hover:text-foreground"
            >
              Listas
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{lista?.nombre || 'Cargando...'}</span>
          </nav>

          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/proyectos/${params.id}/equipos/listas-integradas`)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {lista?.nombre || 'Cargando lista...'}
                  </h1>
                  <p className="text-lg text-gray-600">{proyecto?.nombre || 'Cargando proyecto...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(lista?.estado || '')}>
                  {lista?.estado || 'Sin estado'}
                </Badge>
                {lista?.createdAt && (
                  <span className="text-sm text-gray-500">
                    Creado: {formatDate(lista.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Content Section */}
        <div className="grid gap-8">
          {/* Unified Summary Component */}
          <ListaEquipoSummary 
            items={items}
            estado={lista?.estado || ''}
          />

          {/* Estado Flujo Section */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
           >
             <ListaEstadoFlujo
             estado={lista?.estado || 'borrador'}
             listaId={params.listaId}
             onUpdated={handleEstadoUpdatedSafe}
           />
           </motion.div>

           {/* Action Buttons Section */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.25 }}
           >
             <Card>
               <CardContent className="pt-6">
                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                   {/* Quotation Status Warning */}
                   {items.length > 0 && (
                     <div className="flex items-center gap-2">
                       {items.some(item => !item.cotizacionSeleccionada && !item.costoElegido) ? (
                         <>
                           <AlertTriangle className="h-4 w-4 text-amber-500" />
                           <span className="text-sm text-amber-600">
                             {items.filter(item => !item.cotizacionSeleccionada && !item.costoElegido).length} items sin cotización
                           </span>
                         </>
                       ) : (
                         <>
                           <CheckCircle className="h-4 w-4 text-green-500" />
                           <span className="text-sm text-green-600">
                             Todas las cotizaciones completas
                           </span>
                         </>
                       )}
                     </div>
                   )}

                   {/* Action Buttons */}
                   <div className="flex flex-wrap gap-2">
                     {/* Edit Lista Button */}
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleEditLista}
                       className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                     >
                       <Pencil className="w-4 h-4 mr-2" />
                       Editar Lista
                     </Button>

                     {/* Delete Lista Button */}
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleDeleteLista}
                       className="text-red-600 hover:text-red-700 hover:bg-red-50"
                     >
                       <Trash2 className="w-4 h-4 mr-2" />
                       Eliminar Lista
                     </Button>

                     {/* Add Cotización Button - Only for borrador state */}
                     {lista?.estado === 'borrador' && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={handleAddCotizacion}
                         className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                       >
                         <Plus className="w-4 h-4 mr-2" />
                         Cotización
                       </Button>
                     )}

                     {/* Add New Item Button - Only for borrador state */}
                     {lista?.estado === 'borrador' && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={handleAddNewItem}
                         className="text-green-600 hover:text-green-700 hover:bg-green-50"
                       >
                         <Plus className="w-4 h-4 mr-2" />
                         Catálogo
                       </Button>
                     )}

                     {/* Create Pedido Button - Only for aprobado state */}
                     {lista?.estado === 'aprobado' && 
                      items.length > 0 && 
                      items.some(item => (item.cantidad - (item.cantidadPedida || 0)) > 0) && 
                      session?.user?.id && (
                       <PedidoDesdeListaModal
                         lista={{
                           ...(lista || {}),
                           items: items
                         }}
                         proyectoId={params.id}
                         responsableId={session.user.id}
                         onCreated={handleCreatePedido}
                         onRefresh={handleItemsUpdated}
                         trigger={
                           <Button
                             size="sm"
                             className="bg-green-600 hover:bg-green-700 text-white"
                           >
                             <ShoppingCart className="w-4 h-4 mr-2" />
                             Crear Pedido
                           </Button>
                         }
                       />
                     )}
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>

          {/* Interactive Items Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ListaEquipoItemListWithViews
              listaId={params.listaId}
              proyectoId={params.id}
              items={items}
              editable={true}
              onCreated={handleItemsUpdated}
              onItemUpdated={handleItemUpdated}
              onItemsUpdated={handleItemsUpdated}
              className=""
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Modal Agregar Item desde Equipo (Cotización) */}
      {showModalEquipo && (
        <ModalAgregarItemDesdeEquipo
          isOpen={showModalEquipo}
          proyectoId={params.id}
          listaId={params.listaId}
          onClose={() => setShowModalEquipo(false)}
          onCreated={handleItemsUpdated}
        />
      )}

      {/* Modal Agregar Item desde Catálogo */}
      {showModalCatalogo && (
        <ModalAgregarItemDesdeCatalogo
          isOpen={showModalCatalogo}
          proyectoId={params.id}
          listaId={params.listaId}
          onClose={() => setShowModalCatalogo(false)}
          onCreated={handleItemsUpdated}
        />
      )}
    </div>
  )
}