/**
 * 🚀 Inicializador del Sistema de Eventos
 * 
 * Este archivo centraliza la inicialización del sistema de eventos
 * y debe ser importado al inicio de la aplicación para garantizar
 * que todos los manejadores estén registrados correctamente.
 * 
 * @author TRAE - Agente Senior Fullstack
 * @version 1.0.0
 */

// import { initializeEventBus, eventBus, eventTypes } from './aprovisionamiento-events'
import { logger } from '@/lib/logger'

// 🔧 Variable para controlar la inicialización
let isInitialized = false

/**
 * 🚀 Inicializar el sistema de eventos completo
 * 
 * Esta función debe ser llamada una sola vez al inicio de la aplicación
 * para configurar todos los manejadores de eventos del sistema.
 */
export function initializeEventSystem(): void {
  if (isInitialized) {
    logger.warn('Sistema de eventos ya inicializado, omitiendo...')
    return
  }

  try {
    // 📡 Inicializar el bus de eventos con todos los manejadores
    initializeEventBus()
    
    // ✅ Marcar como inicializado
    isInitialized = true
    
    logger.info('✅ Sistema de eventos inicializado correctamente')
    
    // 🧪 Emitir evento de prueba para verificar funcionamiento
    eventBus.emit(eventTypes.SYSTEM_INITIALIZED, { 
       id: crypto.randomUUID(), 
       tipo: eventTypes.SYSTEM_INITIALIZED, 
       areaOrigen: 'SISTEMA' as const, 
       areaDestino: 'SISTEMA' as const, 
       entidadId: 'system', 
       datos: { 
         timestamp: new Date(), 
         version: '1.0.0', 
         environment: process.env.NODE_ENV || 'development' 
       }, 
       fechaCreacion: new Date() 
     })
    
  } catch (error) {
    logger.error('❌ Error al inicializar sistema de eventos:', error)
    throw new Error(`Fallo en inicialización del sistema de eventos: ${error}`)
  }
}

/**
 * 🔍 Verificar si el sistema de eventos está inicializado
 */
export function isEventSystemInitialized(): boolean {
  return isInitialized
}

/**
 * 🔄 Reinicializar el sistema de eventos (solo para testing)
 */
export function reinitializeEventSystem(): void {
  isInitialized = false
  initializeEventSystem()
}

// 🎯 Exportar el eventBus para uso directo
// export { eventBus, eventTypes } from './aprovisionamiento-events'

// 🚀 Auto-inicialización en entornos de producción
if (process.env.NODE_ENV === 'production') {
  initializeEventSystem()
}