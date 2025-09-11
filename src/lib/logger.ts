// ===================================================
// 📁 Archivo: logger.ts
// 📌 Ubicación: src/lib/
// 🔧 Descripción: Utilidad de logging para la aplicación GYS
//
// 🧠 Uso: Logging centralizado para servicios y APIs
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

// 🎯 Tipos de log disponibles
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

// 🎯 Interface para el logger
interface Logger {
  info: (message: string, data?: any) => void
  warn: (message: string, data?: any) => void
  error: (message: string, data?: any) => void
  debug: (message: string, data?: any) => void
}

// 🎯 Configuración del logger
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// 🎯 Función para formatear mensajes
const formatMessage = (level: LogLevel, message: string, data?: any): string => {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  
  if (data) {
    return `${prefix} ${message} - Data: ${JSON.stringify(data, null, 2)}`
  }
  
  return `${prefix} ${message}`
}

// 🎯 Implementación del logger
export const logger: Logger = {
  info: (message: string, data?: any) => {
    if (isDevelopment || isProduction) {
      console.log(formatMessage('info', message, data))
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isDevelopment || isProduction) {
      console.warn(formatMessage('warn', message, data))
    }
  },
  
  error: (message: string, data?: any) => {
    if (isDevelopment || isProduction) {
      console.error(formatMessage('error', message, data))
    }
  },
  
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(formatMessage('debug', message, data))
    }
  }
}

// 🎯 Logger por defecto
export default logger
