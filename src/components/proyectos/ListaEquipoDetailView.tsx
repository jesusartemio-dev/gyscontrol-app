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
import { motion } from 'framer-motion';
import {
  pageTransitionVariants,
  staggerItemVariants
} from '@/lib/animations/masterDetailAnimations';
import { toast } from 'sonner';
import type { ListaEquipo, ListaEquipoItem, Proyecto, EstadoListaEquipo } from '@/types/modelos'
import { useListaEquipoDetail } from '@/hooks/useListaEquipoDetail';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Package,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  ShoppingCart,
  Target,
  User,
  X
} from 'lucide-react';
import ListaEquipoItemList from '@/components/equipos/ListaEquipoItemList';
import ListaEquipoEditModal from '@/components/equipos/ListaEquipoEditModal';
import ListaEquipoTimeline from '@/components/equipos/ListaEquipoTimeline';
import ListaEstadoFlujoBanner from '@/components/equipos/ListaEstadoFlujoBanner';
import ListaEquipoHistorial from '@/components/equipos/ListaEquipoHistorial';
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
const statusConfig: Record<EstadoListaEquipo, { label: string; color: string; icon: typeof Clock; description: string }> = {
  borrador: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock,
    description: 'Lista en preparación'
  },
  enviada: {
    label: 'Enviada',
    color: 'bg-indigo-100 text-indigo-800',
    icon: FileText,
    description: 'Lista enviada'
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
  aprobada: {
    label: 'Aprobada',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    description: 'Lista aprobada'
  },
  rechazada: {
    label: 'Rechazada',
    color: 'bg-red-100 text-red-800',
    icon: X,
    description: 'Lista rechazada'
  },
  completada: {
    label: 'Completada',
    color: 'bg-emerald-100 text-emerald-800',
    icon: CheckCircle,
    description: 'Lista completada'
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
  
  // Handle lista updated from modal
  const handleListaUpdated = async (updatedLista: ListaEquipo) => {
    try {
      // Force refresh the data to ensure we have the latest information
      await refreshItems();
      toast.success('Lista actualizada correctamente');
    } catch (error) {
      console.error('Error refreshing after lista update:', error);
      toast.error('Error al actualizar la lista');
    }
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
        className="space-y-4"
      >
        {/* 🎯 Unified Compact Header */}
        <motion.div variants={staggerItemVariants}>
          <div className="bg-white border rounded-lg shadow-sm">
            {/* Top Row: Navigation + Title + Actions */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                {/* Left: Back + Breadcrumb + Title */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToMaster}
                    className="h-8 px-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className="hover:text-blue-600 cursor-pointer"
                      onClick={() => router.push(`/proyectos/${proyectoId}`)}
                    >
                      {proyecto?.nombre || 'Proyecto'}
                    </span>
                    <span>/</span>
                    <span
                      className="hover:text-blue-600 cursor-pointer"
                      onClick={() => router.push(`/proyectos/${proyectoId}/equipos/listas`)}
                    >
                      Listas
                    </span>
                    <span>/</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h1 className="text-lg font-semibold text-gray-900">
                      {lista?.nombre || 'Lista de Equipos'}
                    </h1>
                    {lista?.codigo && (
                      <span className="text-sm text-muted-foreground">
                        ({lista.codigo})
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Status + Actions */}
                <div className="flex items-center gap-2">
                  <Badge className={cn('flex items-center gap-1', statusInfo.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </Badge>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(true)}
                    className="h-8"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Stats + Metadata (inline compact) */}
            <div className="px-4 py-2 bg-gray-50/50">
              <div className="flex items-center justify-between">
                {/* Stats Row */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-lg font-bold text-gray-900">{stats.totalItems}</span>
                      <span className="text-xs text-muted-foreground ml-1">items</span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-gray-200" />

                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <span className="text-lg font-bold text-gray-900">{stats.completedItems}</span>
                      <span className="text-xs text-muted-foreground ml-1">aprobados</span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-gray-200" />

                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <span className="text-lg font-bold text-gray-900">{stats.progress}%</span>
                      <span className="text-xs text-muted-foreground ml-1">progreso</span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-gray-200" />

                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>Necesaria: {lista?.fechaNecesaria ? formatDate(lista.fechaNecesaria) : 'No definida'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Actualizado: {lista ? formatDate(lista.updatedAt) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

      {/* 📑 Primary Content - Items List */}
      <motion.div variants={staggerItemVariants}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Items de la Lista</h3>
            </div>

            {lista && (
              <PedidoDesdeListaModal
                lista={{ ...lista, listaEquipoItem: items }}
                proyectoId={proyectoId}
                responsableId={lista.responsableId || 'default-user'}
                onCreated={async (payload) => {
                  try {
                    const result = await createPedidoDesdeListaContextual(payload);
                    if (result) {
                      toast.success('Pedido creado exitosamente');
                      // Refresh the lista data to update cantidadPedida
                      await refreshItems();
                      // Navigate to the pedido detail page
                      router.push(`/proyectos/${proyectoId}/equipos/pedidos/${result.id}`);
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
                    Crear Pedido
                  </Button>
                }
              />
            )}
          </div>

          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ListaEquipoItemList
                listaId={listaId}
                proyectoId={proyectoId}
                items={items}
                editable={true}
                onCreated={handleRefreshItems}
                onDeleted={handleRefreshItems}
              />
          </Suspense>
        </div>
      </motion.div>

      {/* 📊 Additional Information */}
      <motion.div variants={staggerItemVariants} className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Información Adicional
        </h3>

        <div className="space-y-6">
          {/* Timeline Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h4 className="text-md font-semibold">Timeline de la Lista</h4>
            </div>
            {lista && (
              <ListaEquipoTimeline
                lista={lista}
                className="w-full"
              />
            )}
          </div>

          {/* History Section */}
          <ListaEquipoHistorial
            listaId={listaId}
            className="w-full"
          />
        </div>
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
