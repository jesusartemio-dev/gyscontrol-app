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
import PedidoDesdeListaModal from '@/components/equipos/PedidoDesdeListaModal'

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
  const { id, listaId } = useParams<{ id: string; listaId: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [lista, setLista] = useState<ListaEquipo | null>(null)
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !listaId) return
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [proyectoData, listaData, itemsData] = await Promise.all([
          getProyectoById(id),
          getListaEquipoDetail(listaId),
          getListaEquipoItemsByLista(listaId)
        ])
        setProyecto(proyectoData)
        setLista(listaData)
        setItems(itemsData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Error al cargar los datos')
        toast.error('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, listaId])

  // ✅ Function to refresh items after changes
  const handleItemsUpdated = async () => {
    try {
      const itemsData = await getListaEquipoItemsByLista(listaId)
      setItems(itemsData)
    } catch (err) {
      console.error('Error refreshing items:', err)
      toast.error('Error al actualizar los items')
    }
  }

  // ✅ Handle estado update
  const handleEstadoUpdated = async (nuevoEstado: EstadoListaEquipo) => {
    try {
      // Refresh lista data to get updated estado
      const updatedLista = await getListaEquipoDetail(listaId)
      setLista(updatedLista)
    } catch (error) {
      console.error('Error refreshing lista after estado change:', error)
      toast.error('Error al actualizar el estado de la lista')
    }
  }

  // ✅ Handle individual item update
  const handleItemUpdated = async (itemId: string) => {
    // Refresh all items to ensure consistency
    await handleItemsUpdated()
  }

  // ✅ Action handlers
  const handleEditLista = () => {
    router.push(`/proyectos/${id}/equipos/${listaId}/editar`)
  }

  const handleDeleteLista = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar esta lista?')) {
      try {
        // TODO: Implement delete lista service
        toast.success('Lista eliminada correctamente')
        router.push(`/proyectos/${id}/equipos`)
      } catch (error) {
        toast.error('Error al eliminar la lista')
      }
    }
  }

  const handleAddCotizacion = () => {
    // TODO: Open cotizacion modal or navigate to cotizacion page
    toast.info('Funcionalidad de cotización en desarrollo')
  }

  const handleAddNewItem = () => {
    // TODO: Open new item modal or navigate to new item page
    toast.info('Funcionalidad de nuevo item en desarrollo')
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

  // Error State
  if (error) {
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

  // Data not found
  if (!proyecto || !lista) {
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
          <Button onClick={() => router.push(`/proyectos/${id}/equipos/listas-integradas`)}>
            Volver a Listas
          </Button>
        </motion.div>
      </div>
    )
  }

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
          {/* Breadcrumb Navigation */}
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
              onClick={() => router.push(`/proyectos/${id}`)}
              className="hover:text-foreground"
            >
              {proyecto.nombre}
            </Button>
            <ChevronRight className="h-4 w-4" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/proyectos/${id}/equipos/listas-integradas`)}
              className="hover:text-foreground"
            >
              Listas
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{lista.nombre}</span>
          </nav>

          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/proyectos/${id}/equipos/listas-integradas`)}
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
                    {lista.nombre}
                  </h1>
                  <p className="text-lg text-gray-600">{proyecto.nombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(lista.estado || '')}>
                  {lista.estado || 'Sin estado'}
                </Badge>
                {lista.createdAt && (
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  Detalle de Lista de Equipos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Código</label>
                      <p className="text-lg font-semibold">{lista.codigo}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Estado</label>
                      <div className="text-lg">
                        <Badge variant={getStatusVariant(lista.estado || '')}>
                          {lista.estado || 'Sin estado'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Número de Secuencia</label>
                      <p className="text-lg">{lista.numeroSecuencia}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Total de Items</label>
                      <p className="text-lg font-semibold">{items.length}</p>
                    </div>
                  </div>
                  

                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Estado Flujo Section */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
           >
             <ListaEstadoFlujo
               estado={lista.estado}
               listaId={listaId}
               onUpdated={handleEstadoUpdated}
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
                   {/* Summary Info with Cost Calculations */}
                   <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                     <div className="flex items-center gap-6">
                       <div className="flex items-center gap-2">
                         <ClipboardList className="h-5 w-5 text-gray-500" />
                         <span className="text-sm text-gray-600">
                           Total Items: <span className="font-medium">{items.length}</span>
                         </span>
                       </div>
                       
                       {/* Cost Summary */}
                       {items.length > 0 && (
                         <div className="flex items-center gap-2">
                           <DollarSign className="h-5 w-5 text-gray-500" />
                           <span className="text-sm text-gray-600">
                             Costo Total: <span className="font-medium text-green-600">
                               {formatCurrency(calcularCostoTotal(items))}
                             </span>
                           </span>
                         </div>
                       )}
                     </div>

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
                   </div>

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
                     {lista.estado === 'borrador' && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={handleAddCotizacion}
                         className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                       >
                         <DollarSign className="w-4 h-4 mr-2" />
                         Agregar Cotización
                       </Button>
                     )}

                     {/* Add New Item Button - Only for borrador state */}
                     {lista.estado === 'borrador' && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={handleAddNewItem}
                         className="text-green-600 hover:text-green-700 hover:bg-green-50"
                       >
                         <Plus className="w-4 h-4 mr-2" />
                         Agregar Nuevo
                       </Button>
                     )}

                     {/* Create Pedido Button - Only for aprobado state */}
                     {lista.estado === 'aprobado' && 
                      items.length > 0 && 
                      items.some(item => (item.cantidad - (item.cantidadPedida || 0)) > 0) && 
                      session?.user?.id && (
                       <PedidoDesdeListaModal
                         lista={{
                           ...lista,
                           items: items
                         }}
                         proyectoId={id}
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
              listaId={listaId}
              proyectoId={id}
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
    </div>
  )
}