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
export const formatCurrency = (amount: number, currency: string = 'PEN'): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

// 🌐 URL utilities for server-side requests
export const getBaseUrl = (): string => {
  // En el servidor, necesitamos una URL absoluta
  if (typeof window === 'undefined') {
    // En producción, usar NEXTAUTH_URL o construir desde headers
    return process.env.NEXTAUTH_URL || 'http://localhost:3001'
  }
  // En el cliente, usar URL relativa
  return ''
}

export const buildApiUrl = (path: string): string => {
  const baseUrl = getBaseUrl()
  return `${baseUrl}${path}`
}

// 📅 Re-export date utilities
export { formatDateRelative, formatearFecha } from './utils/fechas'

// 💰 Alias para compatibilidad
export const formatearMoneda = formatCurrency

// 🔢 Code generation utilities
export const generarCodigoFinanciero = (numero: number): string => {
  return `APR-${numero.toString().padStart(6, '0')}`
}
