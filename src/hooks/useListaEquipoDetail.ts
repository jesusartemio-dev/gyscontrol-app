/**
 * 🔍 useListaEquipoDetail Hook
 * 
 * Custom hook for managing Lista Equipo detail view with real-time sync.
 * Features:
 * - Detail data fetching with SWR
 * - Real-time synchronization
 * - Optimistic updates
 * - Item management (CRUD)
 * - Statistics calculation
 * - Navigation helpers
 * - Error handling
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import useSWR from 'swr';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
  ListaEquipo, 
  ListaEquipoItem,
  Proyecto
} from '@/types/modelos';
import {
  ListaEquipoUpdatePayload,
  ListaEquipoItemCreatePayload,
  ListaEquipoItemUpdatePayload
} from '@/types/payloads';
import { 
  getListaEquipoDetail,
  updateListaEquipo,
  deleteListaEquipo
} from '@/lib/services/listaEquipo';
import {
  createListaEquipoItem,
  updateListaEquipoItem,
  deleteListaEquipoItem
} from '@/lib/services/listaEquipoItem';
import { useListaEquipoSync } from './useListaEquipoSync';

// ✅ Hook options interface
interface UseListaEquipoDetailOptions {
  listaId: string;
  proyectoId: string;
  initialLista?: ListaEquipo;
  initialItems?: ListaEquipoItem[];
  initialProyecto?: Proyecto;
  enableRealTime?: boolean;
  enableOptimisticUpdates?: boolean;
}

// ✅ Hook return interface
interface UseListaEquipoDetailReturn {
  // Data
  lista: ListaEquipo | null;
  items: ListaEquipoItem[];
  proyecto: Proyecto | null;
  
  // State
  loading: boolean;
  itemsLoading: boolean;
  error: any;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  
  // Statistics
  stats: {
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    totalCost: number;
    averageProgress: number;
    statusDistribution: Record<string, number>;
  };
  
  // Actions
  refresh: () => Promise<void>;
  refreshItems: () => Promise<void>;
  navigateBack: () => void;
  navigateToMaster: () => void;
  
  // Lista CRUD
  updateLista: (payload: ListaEquipoUpdatePayload) => Promise<ListaEquipo>;
  deleteLista: () => Promise<void>;
  
  // Item CRUD
  createItem: (payload: ListaEquipoItemCreatePayload) => Promise<ListaEquipoItem>;
  updateItem: (itemId: string, payload: ListaEquipoItemUpdatePayload) => Promise<ListaEquipoItem>;
  deleteItem: (itemId: string) => Promise<void>;
  
  // Sync operations
  syncDetailData: () => Promise<void>;
  invalidateCache: () => void;
  emitSyncEvent: (event: any) => void;
  subscribeTo: (eventType: any, callback: (event: any) => void) => () => void;
}

// ✅ Main hook
export const useListaEquipoDetail = ({
  listaId,
  proyectoId,
  initialLista,
  initialItems,
  initialProyecto,
  enableRealTime = true,
  enableOptimisticUpdates = true
}: UseListaEquipoDetailOptions): UseListaEquipoDetailReturn => {
  
  // 📊 State management
  const [itemsLoading, setItemsLoading] = useState(false);
  
  const router = useRouter();
  
  // 🔄 Initialize sync hook
  const {
    syncDetailData,
    syncMasterData,
    invalidateCache: syncInvalidateCache,
    emitSyncEvent,
    subscribeTo,
    updateListaWithSync,
    deleteListaWithSync,
    isSyncing,
    lastSyncTime
  } = useListaEquipoSync({
    proyectoId,
    enableRealTime,
    enableOptimisticUpdates
  });
  
  // 📡 Data fetching with SWR
  const swrKey = useMemo(() => ['lista-equipo-detail', listaId], [listaId]);
  
  const {
    data: detailData,
    error,
    isLoading: loading,
    mutate
  } = useSWR(
    swrKey,
    () => getListaEquipoDetail(listaId),
    { 
       fallbackData: initialLista && initialItems && initialProyecto ? {
         ...initialLista,
         items: initialItems,
         proyecto: initialProyecto,
         estadisticas: {
           totalItems: initialItems.length,
           itemsConCotizacion: 0,
           itemsConPedidos: 0,
           itemsCompletos: 0,
           montoPresupuestado: 0,
           montoEstimado: 0,
           ahorroTotal: 0,
           progresoCotizacion: 0,
           progresoPedidos: 0,
           progresoCompletado: 0
         },
         estaCompleta: false,
         tienePedidosPendientes: false,
         necesitaRevision: true,
         puedeGenerarPedidos: false
       } : undefined, 
       revalidateOnFocus: enableRealTime, 
       revalidateOnReconnect: true, 
       dedupingInterval: 5000, 
       errorRetryCount: 3, 
       errorRetryInterval: 1000 
     }
  );
  
  // 🔄 Extract data from response
  const lista = useMemo(() => detailData || null, [detailData]);
  const items = useMemo(() => detailData?.items || [], [detailData]);
  const proyecto = useMemo(() => detailData?.proyecto || null, [detailData]);
  
  // 📊 Calculate statistics
  const stats = useMemo(() => {
    if (!items.length) {
      return {
        totalItems: 0,
        completedItems: 0,
        pendingItems: 0,
        totalCost: 0,
        averageProgress: 0,
        statusDistribution: {}
      };
    }
    
    const totalItems = items.length;
    // ✅ Calculate completion based on estado instead of non-existent 'progreso'
    const completedItems = items.filter(item => 
      item.estado === 'aprobado' || item.cantidadEntregada === item.cantidad
    ).length;
    const pendingItems = totalItems - completedItems;
    
    // ✅ Calculate total cost using available properties
    const totalCost = items.reduce((sum, item) => {
      const itemCost = item.costoReal || item.costoElegido || item.costoPedido || 
                      (item.precioElegido && item.cantidad ? item.precioElegido * item.cantidad : 0);
      return sum + (itemCost || 0);
    }, 0);
    
    // ✅ Calculate progress based on completion percentage
    const averageProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    
    // Status distribution
    const statusDistribution = items.reduce((acc, item) => {
      const status = item.estado || 'PENDIENTE';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalItems,
      completedItems,
      pendingItems,
      totalCost,
      averageProgress: Math.round(averageProgress * 100) / 100,
      statusDistribution
    };
  }, [items]);
  
  // 🔄 Refresh detail data
  const refresh = useCallback(async () => {
    try {
      await syncDetailData(listaId);
      await mutate();
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error refreshing detail data:', error);
      toast.error('Error al actualizar los datos');
    }
  }, [syncDetailData, listaId, mutate]);
  
  // 🔄 Refresh items only
  const refreshItems = useCallback(async () => {
    try {
      setItemsLoading(true);
      await mutate();
      toast.success('Items actualizados correctamente');
    } catch (error) {
      console.error('Error refreshing items:', error);
      toast.error('Error al actualizar los items');
    } finally {
      setItemsLoading(false);
    }
  }, [mutate]);
  
  // 🔄 Navigation helpers
  const navigateBack = useCallback(() => {
    router.back();
  }, [router]);
  
  const navigateToMaster = useCallback(() => {
    router.push(`/proyectos/${proyectoId}/equipos`);
  }, [router, proyectoId]);
  
  // 🔄 Update lista with sync
  const updateLista = useCallback(async (payload: ListaEquipoUpdatePayload): Promise<ListaEquipo> => {
    try {
      const updatedLista = await updateListaWithSync(listaId, payload);
      
      // Update local cache
      await mutate((current: any) => {
        if (!current) return current;
        return {
          ...current,
          lista: updatedLista
        };
      }, { revalidate: false });
      
      toast.success('Lista actualizada correctamente');
      return updatedLista;
    } catch (error) {
      console.error('Error updating lista:', error);
      toast.error('Error al actualizar la lista');
      throw error;
    }
  }, [listaId, updateListaWithSync, mutate]);
  
  // 🗑️ Delete lista with sync
  const deleteLista = useCallback(async (): Promise<void> => {
    try {
      await deleteListaWithSync(listaId);
      toast.success('Lista eliminada correctamente');
      navigateToMaster();
    } catch (error) {
      console.error('Error deleting lista:', error);
      toast.error('Error al eliminar la lista');
      throw error;
    }
  }, [listaId, deleteListaWithSync, navigateToMaster]);
  
  // ➕ Create item
  const createItem = useCallback(async (payload: ListaEquipoItemCreatePayload): Promise<ListaEquipoItem> => {
    try {
      const newItem = await createListaEquipoItem({ ...payload, listaId: listaId });
      
      // ✅ Validate that the item was created successfully
      if (!newItem) {
        throw new Error('No se pudo crear el item');
      }
      
      // Optimistic update
      if (enableOptimisticUpdates) {
        await mutate((current: any) => {
          if (!current) return current;
          return {
            ...current,
            items: [...current.items, newItem]
          };
        }, { revalidate: false });
      }
      
      // Emit sync event
      emitSyncEvent({
        type: 'item_created',
        listaId,
        proyectoId,
        data: newItem
      });
      
      // Sync master data to update statistics
      await syncMasterData();
      
      toast.success('Item creado correctamente');
      return newItem;
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Error al crear el item');
      throw error;
    }
  }, [listaId, enableOptimisticUpdates, mutate, emitSyncEvent, proyectoId, syncMasterData]);
  
  // 🔄 Update item
  const updateItem = useCallback(async (itemId: string, payload: ListaEquipoItemUpdatePayload): Promise<ListaEquipoItem> => {
    try {
      const updatedItem = await updateListaEquipoItem(itemId, payload);
      
      // ✅ Validate that the item was updated successfully
      if (!updatedItem) {
        throw new Error('No se pudo actualizar el item');
      }
      
      // Optimistic update
      if (enableOptimisticUpdates) {
        await mutate((current: any) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item: ListaEquipoItem) => 
              item.id === itemId ? updatedItem : item
            )
          };
        }, { revalidate: false });
      }
      
      // Emit sync event
      emitSyncEvent({
        type: 'item_updated',
        listaId,
        proyectoId,
        data: updatedItem
      });
      
      // Sync master data to update statistics
      await syncMasterData();
      
      toast.success('Item actualizado correctamente');
      return updatedItem;
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Error al actualizar el item');
      throw error;
    }
  }, [enableOptimisticUpdates, mutate, emitSyncEvent, listaId, proyectoId, syncMasterData]);
  
  // 🗑️ Delete item
  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    try {
      await deleteListaEquipoItem(itemId);
      
      // Optimistic update
      if (enableOptimisticUpdates) {
        await mutate((current: any) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.filter((item: ListaEquipoItem) => item.id !== itemId)
          };
        }, { revalidate: false });
      }
      
      // Emit sync event
      emitSyncEvent({
        type: 'item_deleted',
        listaId,
        proyectoId,
        data: { itemId }
      });
      
      // Sync master data to update statistics
      await syncMasterData();
      
      toast.success('Item eliminado correctamente');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Error al eliminar el item');
      throw error;
    }
  }, [enableOptimisticUpdates, mutate, emitSyncEvent, listaId, proyectoId, syncMasterData]);
  
  // 🔄 Cache invalidation helper
  const invalidateCache = useCallback(() => {
    syncInvalidateCache(listaId);
  }, [syncInvalidateCache, listaId]);
  
  // 🔄 Subscribe to sync events for real-time updates
  useEffect(() => {
    if (!enableRealTime) return;
    
    const unsubscribers = [
      // Listen for lista updates from other views
      subscribeTo('lista_updated', (event) => {
        if (event.listaId === listaId) {
          mutate();
        }
      }),
      
      // Listen for item changes from other views
      subscribeTo('item_created', (event) => {
        if (event.listaId === listaId) {
          mutate();
        }
      }),
      
      subscribeTo('item_updated', (event) => {
        if (event.listaId === listaId) {
          mutate();
        }
      }),
      
      subscribeTo('item_deleted', (event) => {
        if (event.listaId === listaId) {
          mutate();
        }
      })
    ];
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [enableRealTime, subscribeTo, listaId, mutate]);
  
  return {
    // Data
    lista,
    items,
    proyecto,
    
    // State
    loading,
    itemsLoading,
    error,
    isSyncing,
    lastSyncTime,
    
    // Statistics
    stats,
    
    // Actions
    refresh,
    refreshItems,
    navigateBack,
    navigateToMaster,
    
    // Lista CRUD
    updateLista,
    deleteLista,
    
    // Item CRUD
    createItem,
    updateItem,
    deleteItem,
    
    // Sync operations
    syncDetailData: () => syncDetailData(listaId),
    invalidateCache,
    emitSyncEvent,
    subscribeTo
  };
};

export default useListaEquipoDetail;
export type { UseListaEquipoDetailOptions, UseListaEquipoDetailReturn };
