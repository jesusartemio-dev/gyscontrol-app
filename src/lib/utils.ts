import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 📅 Date formatting utilities
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

// 💰 Currency formatting utilities
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

// 📊 Percentage formatting utilities
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
}

// 🌐 URL utilities for server-side requests
export const getBaseUrl = (): string => {
  // En el servidor, necesitamos una URL absoluta
  if (typeof window === 'undefined') {
    // En producción, usar NEXTAUTH_URL. Si no existe, error crítico
    const nextAuthUrl = process.env.NEXTAUTH_URL
    if (!nextAuthUrl) {
      throw new Error('NEXTAUTH_URL environment variable is required for server-side API calls')
    }
    return nextAuthUrl
  }
  // En el cliente, usar URL relativa
  return ''
}

// ✅ Función mejorada que maneja URLs correctamente en cliente y servidor
export const buildApiUrl = (path: string): string => {
  // En el cliente, siempre usar URLs relativas para evitar problemas de puerto
  if (typeof window !== 'undefined') {
    return path
  }
  // En el servidor, SIEMPRE usar URL absoluta para evitar errores de parsing
  const baseUrl = getBaseUrl()
  return `${baseUrl}${path}`
}

// 📅 Re-export date utilities
export { formatDateRelative, formatearFecha } from './utils/fechas'

// 💰 Alias para compatibilidad
export const formatearMoneda = formatCurrency

// ⏰ Time formatting utilities
export const formatearHoras = (horas: number): string => {
  if (horas < 1) {
    return `${Math.round(horas * 60)}min`
  }
  const horasEnteras = Math.floor(horas)
  const minutos = Math.round((horas - horasEnteras) * 60)
  return minutos > 0 ? `${horasEnteras}h ${minutos}min` : `${horasEnteras}h`
}

// 📊 Percentage formatting with custom name
export const formatearPorcentaje = (value: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
}

// 🔢 Code generation utilities
export const generarCodigoFinanciero = (numero: number): string => {
  return `APR-${numero.toString().padStart(6, '0')}`
}
