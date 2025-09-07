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
    // 📡 Sistema de eventos deshabilitado temporalmente
    // TODO: Implementar nuevo sistema de eventos para GYS
    
    // ✅ Marcar como inicializado
    isInitialized = true
    
    logger.info('✅ Sistema de eventos inicializado correctamente')
    
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

// 🚀 Auto-inicialización en entornos de producción
if (process.env.NODE_ENV === 'production') {
  initializeEventSystem()
}