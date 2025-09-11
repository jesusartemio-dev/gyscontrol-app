/**
 * 🔄 useListaEquipoSync Hook
 * 
 * Custom hook for synchronizing data between Master and Detail views.
 * Features:
 * - Real-time data synchronization
 * - Optimistic updates
 * - Cache invalidation strategies
 * - Event-based communication
 * - Error handling and rollback
 * - Performance optimization
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { 
  ListaEquipo, 
  ListaEquipoItem
} from '@/types/modelos';
import { ListaEquipoUpdatePayload } from '@/types/payloads';
import { 
  updateListaEquipo, 
  deleteListaEquipo,
  getListasEquipoMaster,
  getListaEquipoDetail,
  ListaEquipoMaster
} from '@/lib/services/listaEquipo';

// ✅ Sync event types
type SyncEventType = 
  | 'lista_updated'
  | 'lista_deleted'
  | 'lista_created'
  | 'item_updated'
  | 'item_deleted'
  | 'item_created'
  | 'status_changed';

// ✅ Sync event interface
interface SyncEvent {
  type: SyncEventType;
  listaId: string;
  proyectoId: string;
  data?: any;
  timestamp: number;
}

// ✅ Hook options
interface UseListaEquipoSyncOptions {
  proyectoId: string;
  enableRealTime?: boolean;
  enableOptimisticUpdates?: boolean;
  syncInterval?: number;
}

// ✅ Hook return type
interface UseListaEquipoSyncReturn {
  // 🔄 Sync methods
  syncMasterData: () => Promise<void>;
  syncDetailData: (listaId: string) => Promise<void>;
  invalidateCache: (listaId?: string) => void;
  
  // 📡 Event methods
  emitSyncEvent: (event: Omit<SyncEvent, 'timestamp'>) => void;
  subscribeTo: (eventType: SyncEventType, callback: (event: SyncEvent) => void) => () => void;
  
  // 🔄 CRUD operations with sync
  updateListaWithSync: (listaId: string, payload: ListaEquipoUpdatePayload) => Promise<ListaEquipo>;
  deleteListaWithSync: (listaId: string) => Promise<void>;
  
  // 📊 State
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncErrors: string[];
}

// ✅ Global event emitter for sync events
class SyncEventEmitter {
  private listeners: Map<SyncEventType, Set<(event: SyncEvent) => void>> = new Map();
  
  emit(event: SyncEvent) {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in sync event listener:', error);
        }
      });
    }
  }
  
  subscribe(eventType: SyncEventType, callback: (event: SyncEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }
  
  clear() {
    this.listeners.clear();
  }
}

// ✅ Global sync event emitter instance
const syncEmitter = new SyncEventEmitter();

// ✅ Main hook
export const useListaEquipoSync = ({
  proyectoId,
  enableRealTime = true,
  enableOptimisticUpdates = true,
  syncInterval = 30000 // 30 seconds
}: UseListaEquipoSyncOptions): UseListaEquipoSyncReturn => {
  
  // 📊 State management
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  
  // 🔄 Refs for cleanup
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<(() => void)[]>([]);
  
  // 🔄 Generate SWR keys
  const getMasterKey = useCallback((filters?: any) => {
    return ['lista-equipo-master', proyectoId, filters];
  }, [proyectoId]);
  
  const getDetailKey = useCallback((listaId: string) => {
    return ['lista-equipo-detail', listaId];
  }, []);
  
  // 📡 Sync master data
  const syncMasterData = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncErrors([]);
      
      // Invalidate all master cache entries
      await mutate(
        key => Array.isArray(key) && key[0] === 'lista-equipo-master' && key[1] === proyectoId,
        undefined,
        { revalidate: true }
      );
      
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error syncing master data:', error);
      setSyncErrors(prev => [...prev, 'Error sincronizando datos maestros']);
      toast.error('Error al sincronizar datos');
    } finally {
      setIsSyncing(false);
    }
  }, [proyectoId]);
  
  // 📡 Sync detail data
  const syncDetailData = useCallback(async (listaId: string) => {
    try {
      setIsSyncing(true);
      setSyncErrors([]);
      
      // Invalidate specific detail cache
      await mutate(getDetailKey(listaId), undefined, { revalidate: true });
      
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error syncing detail data:', error);
      setSyncErrors(prev => [...prev, 'Error sincronizando datos de detalle']);
      toast.error('Error al sincronizar datos de detalle');
    } finally {
      setIsSyncing(false);
    }
  }, [getDetailKey]);
  
  // 🗑️ Invalidate cache
  const invalidateCache = useCallback((listaId?: string) => {
    if (listaId) {
      // Invalidate specific detail cache
      mutate(getDetailKey(listaId), undefined, { revalidate: false });
    } else {
      // Invalidate all master caches for this project
      mutate(
        key => Array.isArray(key) && key[0] === 'lista-equipo-master' && key[1] === proyectoId,
        undefined,
        { revalidate: false }
      );
    }
  }, [proyectoId, getDetailKey]);
  
  // 📡 Emit sync event
  const emitSyncEvent = useCallback((event: Omit<SyncEvent, 'timestamp'>) => {
    const fullEvent: SyncEvent = {
      ...event,
      timestamp: Date.now()
    };
    
    syncEmitter.emit(fullEvent);
  }, []);
  
  // 📡 Subscribe to sync events
  const subscribeTo = useCallback((eventType: SyncEventType, callback: (event: SyncEvent) => void) => {
    const unsubscribe = syncEmitter.subscribe(eventType, callback);
    subscribersRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);
  
  // 🔄 Update lista with sync
  const updateListaWithSync = useCallback(async (listaId: string, payload: ListaEquipoUpdatePayload): Promise<ListaEquipo> => {
    try {
      // Optimistic update if enabled
      if (enableOptimisticUpdates) {
        // Update detail cache optimistically
        mutate(getDetailKey(listaId), (current: ListaEquipo | undefined) => {
          if (!current) return current;
          return { ...current, ...payload };
        }, { revalidate: false });
        
        // Update master cache optimistically
        mutate(
          key => Array.isArray(key) && key[0] === 'lista-equipo-master' && key[1] === proyectoId,
          (current: any) => {
            if (!current?.data) return current;
            return {
              ...current,
              data: current.data.map((lista: ListaEquipoMaster) => 
                lista.id === listaId ? { ...lista, ...payload } : lista
              )
            };
          },
          { revalidate: false }
        );
      }
      
      // Perform actual update
      const updatedLista = await updateListaEquipo(listaId, payload);
      
      // ✅ Validate that the update was successful
      if (!updatedLista) {
        throw new Error('Failed to update lista: Service returned null');
      }
      
      // Emit sync event
      emitSyncEvent({
        type: 'lista_updated',
        listaId,
        proyectoId,
        data: updatedLista
      });
      
      // Revalidate caches
      await Promise.all([
        mutate(getDetailKey(listaId), updatedLista, { revalidate: false }),
        syncMasterData()
      ]);
      
      return updatedLista;
      
    } catch (error) {
      console.error('Error updating lista with sync:', error);
      
      // Rollback optimistic updates
      if (enableOptimisticUpdates) {
        await Promise.all([
          mutate(getDetailKey(listaId), undefined, { revalidate: true }),
          syncMasterData()
        ]);
      }
      
      throw error;
    }
  }, [proyectoId, enableOptimisticUpdates, getDetailKey, emitSyncEvent, syncMasterData]);
  
  // 🗑️ Delete lista with sync
  const deleteListaWithSync = useCallback(async (listaId: string): Promise<void> => {
    try {
      // Optimistic update if enabled
      if (enableOptimisticUpdates) {
        // Remove from master cache optimistically
        mutate(
          key => Array.isArray(key) && key[0] === 'lista-equipo-master' && key[1] === proyectoId,
          (current: any) => {
            if (!current?.data) return current;
            return {
              ...current,
              data: current.data.filter((lista: ListaEquipoMaster) => lista.id !== listaId)
            };
          },
          { revalidate: false }
        );
      }
      
      // Perform actual deletion
      await deleteListaEquipo(listaId);
      
      // Emit sync event
      emitSyncEvent({
        type: 'lista_deleted',
        listaId,
        proyectoId
      });
      
      // Clean up caches
      invalidateCache(listaId);
      await syncMasterData();
      
    } catch (error) {
      console.error('Error deleting lista with sync:', error);
      
      // Rollback optimistic updates
      if (enableOptimisticUpdates) {
        await syncMasterData();
      }
      
      throw error;
    }
  }, [proyectoId, enableOptimisticUpdates, emitSyncEvent, invalidateCache, syncMasterData]);
  
  // 🔄 Setup real-time sync interval
  useEffect(() => {
    if (!enableRealTime) return;
    
    syncIntervalRef.current = setInterval(() => {
      syncMasterData();
    }, syncInterval);
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [enableRealTime, syncInterval, syncMasterData]);
  
  // 🧹 Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      // Unsubscribe from all events
      subscribersRef.current.forEach(unsubscribe => unsubscribe());
      subscribersRef.current = [];
    };
  }, []);
  
  return {
    // 🔄 Sync methods
    syncMasterData,
    syncDetailData,
    invalidateCache,
    
    // 📡 Event methods
    emitSyncEvent,
    subscribeTo,
    
    // 🔄 CRUD operations with sync
    updateListaWithSync,
    deleteListaWithSync,
    
    // 📊 State
    isSyncing,
    lastSyncTime,
    syncErrors
  };
};

export default useListaEquipoSync;
export type { SyncEvent, SyncEventType, UseListaEquipoSyncOptions, UseListaEquipoSyncReturn };
