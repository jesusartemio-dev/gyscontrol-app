/**
 * 🎯 ListaEquipoDetailView Component
 * 
 * Main Detail view component for comprehensive equipment list management.
 * Features:
 * - Complete equipment list management interface
 * - Breadcrumb navigation and context
 * - Tabbed interface for different sections
 * - Integration with existing ListaEquipoItemList
 * - Real-time data synchronization
 * - Responsive design with animations
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  pageTransitionVariants,
  staggerItemVariants,
  loadingVariants,
  buttonInteractionVariants
} from '@/lib/animations/masterDetailAnimations';
import { toast } from 'sonner';
import type { ListaEquipo, ListaEquipoItem, Proyecto } from '@/types/modelos'
import type { ListaEquipoUpdatePayload } from '@/types/payloads';
import { useListaEquipoDetail } from '@/hooks/useListaEquipoDetail';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DetailBreadcrumb } from '@/components/common/DetailBreadcrumb';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
  Package,
  Settings,
  History,
  Edit,
  Save,
  X,
  RefreshCw,
  Download,
  Share,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  FileText,
  ShoppingCart
} from 'lucide-react';
import ListaEquipoItemList from '@/components/equipos/ListaEquipoItemList';
import ListaEquipoForm from '@/components/equipos/ListaEquipoForm';
import ListaEquipoEditModal from '@/components/equipos/ListaEquipoEditModal';
import ListaEquipoTimeline from '@/components/equipos/ListaEquipoTimeline';
import ListaEstadoFlujo from '@/components/equipos/ListaEstadoFlujo';
import ListaEstadoFlujoBanner from '@/components/equipos/ListaEstadoFlujoBanner';
import PedidoDesdeListaModal from '@/components/equipos/PedidoDesdeListaModal';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { createPedidoDesdeListaContextual } from '@/lib/services/pedidoEquipo';

// ✅ Props interface
interface ListaEquipoDetailViewProps {
  proyectoId: string;
  listaId: string;
  initialLista?: ListaEquipo;
  initialItems?: ListaEquipoItem[];
  initialProyecto?: Proyecto;
}

// ✅ Configuración de estados con iconos y colores (alineado con EstadoListaEquipo)
const statusConfig = {
  borrador: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock,
    description: 'Lista en preparación'
  },
  por_revisar: {
    label: 'Por Revisar',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertCircle,
    description: 'Esperando revisión técnica'
  },
  por_cotizar: {
    label: 'Por Cotizar',
    color: 'bg-blue-100 text-blue-800',
    icon: DollarSign,
    description: 'Pendiente de cotización'
  },
  por_validar: {
    label: 'Por Validar',
    color: 'bg-purple-100 text-purple-800',
    icon: FileText,
    description: 'Esperando validación'
  },
  por_aprobar: {
    label: 'Por Aprobar',
    color: 'bg-orange-100 text-orange-800',
    icon: User,
    description: 'Pendiente de aprobación'
  },
  aprobado: {
    label: 'Aprobado',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    description: 'Lista aprobada'
  },
  rechazado: {
    label: 'Rechazado',
    color: 'bg-red-100 text-red-800',
    icon: X,
    description: 'Lista rechazada'
  }
};

// ✅ Using centralized animation variants from masterDetailAnimations.ts
// Removed local animation variants in favor of standardized ones

const ListaEquipoDetailView: React.FC<ListaEquipoDetailViewProps> = ({
  proyectoId,
  listaId,
  initialLista,
  initialItems = [],
  initialProyecto
}) => {
  const router = useRouter();
  
  // 🔄 Use optimized hook with synchronization
  const {
    lista,
    items,
    proyecto,
    loading,
    itemsLoading,
    updateLista,
    refreshItems,
    error
  } = useListaEquipoDetail({
    listaId,
    proyectoId,
    initialLista,
    initialItems,
    initialProyecto
  });
  
  // 🔄 Local state management
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  
  // Handle lista updated from modal
  const handleListaUpdated = (updatedLista: ListaEquipo) => {
    // The hook will refresh the data, but we can also update local state if needed
    toast.success('Lista actualizada correctamente');
  };
  
  // 🔁 Handle navigation back to master
  const handleBackToMaster = () => {
    router.push(`/proyectos/${proyectoId}/equipos/listas`);
  };
  
  
  // 🔁 Handle items refresh
  const handleRefreshItems = useCallback(async () => {
    try {
      await refreshItems();
      toast.success('Items actualizados');
    } catch (error) {
      console.error('Error refreshing items:', error);
      toast.error('Error al actualizar los items');
    }
  }, [refreshItems]);
  
  // 📊 Calculate statistics
  const stats = useMemo(() => {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.estado === 'aprobado').length;
    const totalCost = items.reduce((sum, item) => sum + (item.costoElegido || 0), 0);
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    return {
      totalItems,
      completedItems,
      totalCost,
      progress
    };
  }, [items]);
  
  // ✅ Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  // ✅ Error state
  if (error || (!loading && (!lista || !proyecto))) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error al cargar los datos</h2>
        <p className="text-muted-foreground mb-4">
          {error || 'No se pudo cargar la información de la lista'}
        </p>
        <Button onClick={handleBackToMaster} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Listas
        </Button>
      </div>
    );
  }
  
  const statusInfo = statusConfig[lista?.estado || 'borrador'] || statusConfig.borrador;
  const StatusIcon = statusInfo.icon;
  
  return (
    <>
      <motion.div
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6"
      >
        {/* 🧭 Enhanced Breadcrumb Navigation */}
        <motion.div variants={staggerItemVariants}>
          <DetailBreadcrumb
            proyectoId={proyecto?.id || proyectoId}
            proyectoNombre={proyecto?.nombre || 'Proyecto'}
            masterPath={`/proyectos/${proyectoId}/equipos/listas`}
            masterLabel="Listas de Equipos"
            detailLabel={lista?.nombre || 'Lista de Equipos'}
            detailId={lista?.id || listaId}
            status={lista?.estado}
            metadata={lista ? `${stats.totalItems} items • Actualizado ${formatDate(lista.updatedAt)}` : 'Cargando...'}
            showBackButton={true}
            showHomeLink={true}
            onBackClick={() => router.push(`/proyectos/${proyectoId}/equipos/listas`)}
          />
        </motion.div>
      
      {/* 📋 Header Section */}
      <motion.div variants={staggerItemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToMaster}
                  className="mt-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
                
                <div className="space-y-2">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Package className="w-6 h-6 text-blue-600" />
                    {lista?.nombre || 'Lista de Equipos'}
                  </CardTitle>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Actualizado {lista ? formatDate(lista.updatedAt) : 'N/A'}
                    </div>
                    {/* Responsable info removed - not available in ListaEquipo schema */}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={cn('flex items-center gap-1', statusInfo.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </Badge>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar Lista
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* 📊 Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-xl font-semibold">{stats.totalItems}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Completados</p>
                  <p className="text-xl font-semibold">{stats.completedItems}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Progreso</p>
                  <p className="text-xl font-semibold">{stats.progress}%</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <DollarSign className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Costo Total</p>
                  <p className="text-xl font-semibold">{formatCurrency(stats.totalCost)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* 🎯 Status Flow Banner - Always Visible */}
      {lista && (
        <motion.div variants={staggerItemVariants}>
          <ListaEstadoFlujoBanner
            estado={lista.estado}
            listaId={lista.id}
            onUpdated={(nuevoEstado) => {
              // Refresh the data to reflect the new state
              handleRefreshItems()
            }}
          />
        </motion.div>
      )}

      {/* 📑 Primary Content - Always Visible */}
      <motion.div variants={staggerItemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="items" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Items
              </TabsTrigger>
              <TabsTrigger value="estados" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Estados
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              {lista && (
                <PedidoDesdeListaModal
                  lista={lista}
                  proyectoId={proyectoId}
                  responsableId={lista.responsableId || 'default-user'}
                  onCreated={async (payload) => {
                    try {
                      const result = await createPedidoDesdeListaContextual(payload);
                      if (result) {
                        toast.success('Pedido creado exitosamente');
                        // Refresh the lista data to update cantidadPedida
                        await refreshItems();
                        return result;
                      }
                      return null;
                    } catch (error) {
                      console.error('Error creating pedido:', error);
                      toast.error('Error al crear el pedido');
                      return null;
                    }
                  }}
                  onRefresh={refreshItems}
                  trigger={
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Crear Pedidos
                    </Button>
                  }
                />
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshItems}
                disabled={itemsLoading}
              >
                <RefreshCw className={cn('w-4 h-4 mr-1', itemsLoading && 'animate-spin')} />
                Actualizar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
          
          <TabsContent value="items" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ListaEquipoItemList
                  listaId={listaId}
                  proyectoId={proyectoId}
                  items={items}
                  editable={true}
                  onCreated={handleRefreshItems}
                />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="estados" className="space-y-4">
            {lista && (
              <ListaEstadoFlujo 
                estado={lista.estado}
                listaId={lista.id}
                onUpdated={async (nuevoEstado) => {
                  try {
                    await updateLista({ estado: nuevoEstado });
                    toast.success(`Estado actualizado a: ${nuevoEstado}`);
                  } catch (error) {
                    console.error('Error updating estado:', error);
                    toast.error('Error al actualizar el estado');
                  }
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* 📊 Additional Information - Secondary Tabs */}
      <motion.div variants={staggerItemVariants} className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Información Adicional
        </h3>
        
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            {lista && (
              <ListaEquipoTimeline 
                lista={lista}
                className="w-full"
              />
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historial de Cambios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Historial de cambios próximamente</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuración de Lista
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Configuraciones avanzadas próximamente</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>


      </motion.div>

      <ListaEquipoEditModal
        lista={lista}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdated={handleListaUpdated}
      />
    </>
  );
};

export default ListaEquipoDetailView;
