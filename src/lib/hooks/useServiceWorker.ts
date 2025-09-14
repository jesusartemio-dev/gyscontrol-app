/**
 * 🚀 Hook para Service Worker y PWA
 * 
 * Gestiona el registro, actualización y estado del Service Worker.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// 📡 Tipos para el hook
interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isControlling: boolean;
  updateAvailable: boolean;
  error: string | null;
  cacheStatus: Record<string, number> | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  register: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
  getCacheStatus: () => Promise<void>;
  clearCache: () => Promise<void>;
}

/**
 * Hook para gestionar Service Worker y PWA
 * 
 * @param swPath - Ruta del Service Worker (por defecto '/sw.js')
 * @returns Estado y funciones del Service Worker
 */
export const useServiceWorker = (swPath = '/sw.js'): UseServiceWorkerReturn => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isControlling: false,
    updateAvailable: false,
    error: null,
    cacheStatus: null,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // ✅ Verificar soporte para Service Worker
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator;
    setState(prev => ({ ...prev, isSupported }));
    
    if (isSupported) {
      // 📊 Verificar si ya hay un SW controlando
      const isControlling = !!navigator.serviceWorker.controller;
      setState(prev => ({ ...prev, isControlling }));
    }
  }, []);

  // 🔄 Registrar Service Worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      console.warn('🚀 SW: Service Worker no soportado en este navegador');
      return;
    }

    try {
      setState(prev => ({ ...prev, isInstalling: true, error: null }));
      
      const reg = await navigator.serviceWorker.register(swPath, {
        scope: '/',
        updateViaCache: 'none',
      });
      
      setRegistration(reg);
      
      setState(prev => ({
        ...prev,
        isRegistered: true,
        isInstalling: false,
      }));
      
      console.log('✅ SW: Service Worker registrado correctamente');
      
      // 👀 Configurar listeners
      setupServiceWorkerListeners(reg);
      
    } catch (error) {
      console.error('❌ SW: Error registrando Service Worker:', error);
      setState(prev => ({
        ...prev,
        isInstalling: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [state.isSupported, swPath]);

  // 🔄 Configurar listeners del Service Worker
  const setupServiceWorkerListeners = useCallback((reg: ServiceWorkerRegistration) => {
    // 📊 Listener para actualizaciones
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      
      setState(prev => ({ ...prev, isInstalling: true }));
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          setState(prev => ({
            ...prev,
            isInstalling: false,
            isWaiting: true,
            updateAvailable: !!navigator.serviceWorker.controller,
          }));
        }
      });
    });
    
    // 🔄 Listener para cambios de controlador
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setState(prev => ({ ...prev, isControlling: true }));
      console.log('🔄 SW: Nuevo Service Worker tomó control');
    });
    
    // 📡 Listener para mensajes del SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_STATUS') {
        setState(prev => ({ ...prev, cacheStatus: event.data.status }));
      }
    });
    
  }, []);

  // 🔄 Actualizar Service Worker
  const update = useCallback(async () => {
    if (!registration) {
      console.warn('🔄 SW: No hay registro para actualizar');
      return;
    }
    
    try {
      await registration.update();
      console.log('🔄 SW: Verificando actualizaciones...');
    } catch (error) {
      console.error('❌ SW: Error actualizando:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error actualizando',
      }));
    }
  }, [registration]);

  // ⏭️ Saltar espera y activar nuevo SW
  const skipWaiting = useCallback(() => {
    if (!registration || !registration.waiting) {
      console.warn('⏭️ SW: No hay SW esperando');
      return;
    }
    
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setState(prev => ({ ...prev, isWaiting: false }));
    
    console.log('⏭️ SW: Activando nuevo Service Worker...');
  }, [registration]);

  // 📊 Obtener estado del cache
  const getCacheStatus = useCallback(async () => {
    if (!navigator.serviceWorker.controller) {
      console.warn('📊 SW: No hay SW controlando para obtener estado del cache');
      return;
    }
    
    try {
      const messageChannel = new MessageChannel();
      
      const statusPromise = new Promise<Record<string, number>>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
      });
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
      
      const status = await statusPromise;
      setState(prev => ({ ...prev, cacheStatus: status }));
      
    } catch (error) {
      console.error('📊 SW: Error obteniendo estado del cache:', error);
    }
  }, []);

  // 🧹 Limpiar cache
  const clearCache = useCallback(async () => {
    try {
      const cacheNames = await caches.keys();
      
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      setState(prev => ({ ...prev, cacheStatus: null }));
      
      console.log('🧹 SW: Cache limpiado correctamente');
      
    } catch (error) {
      console.error('❌ SW: Error limpiando cache:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error limpiando cache',
      }));
    }
  }, []);

  // 🚀 Auto-registro en producción
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && state.isSupported && !state.isRegistered) {
      register();
    }
  }, [state.isSupported, state.isRegistered, register]);

  // 🔄 Verificar actualizaciones periódicamente
  useEffect(() => {
    if (!registration) return;
    
    const interval = setInterval(() => {
      update();
    }, 60000); // Verificar cada minuto
    
    return () => clearInterval(interval);
  }, [registration, update]);

  return {
    ...state,
    register,
    update,
    skipWaiting,
    getCacheStatus,
    clearCache,
  };
};

// 📊 Métricas de performance (desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 useServiceWorker: Hook cargado');
}

export default useServiceWorker;