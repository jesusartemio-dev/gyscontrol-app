// ===================================================
// 📁 Archivo: plantilla-utils.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Utilidades para formateo y cálculos de plantillas de equipos
// ===================================================

import type { PlantillaEquipoItem } from '@/types'

/**
 * Formats a number as currency in Peruvian format (USD)
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Formats a number with thousand separators
 * @param value - The number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Calculates the total cost for internal pricing
 * @param items - Array of PlantillaEquipoItem
 * @returns Total internal cost
 */
export const calculateTotalInternal = (items: PlantillaEquipoItem[]): number => {
  return items.reduce((total, item) => total + item.costoInterno, 0)
}

/**
 * Calculates the total cost for client pricing
 * @param items - Array of PlantillaEquipoItem
 * @returns Total client cost
 */
export const calculateTotalClient = (items: PlantillaEquipoItem[]): number => {
  return items.reduce((total, item) => total + item.costoCliente, 0)
}

/**
 * Calculates the profit margin between client and internal pricing
 * @param items - Array of PlantillaEquipoItem
 * @returns Profit margin as a percentage
 */
export const calculateProfitMargin = (items: PlantillaEquipoItem[]): number => {
  const totalInternal = calculateTotalInternal(items)
  const totalClient = calculateTotalClient(items)
  
  if (totalInternal === 0) return 0
  
  return ((totalClient - totalInternal) / totalInternal) * 100
}

/**
 * Calculates the rental value (renta) based on client cost
 * @param totalClientCost - Total client cost
 * @param rentalPercentage - Rental percentage (default: 0.15 = 15%)
 * @returns Rental value
 */
export const calculateRental = (totalClientCost: number, rentalPercentage: number = 0.15): number => {
  return totalClientCost * rentalPercentage
}

/**
 * Gets the variant class for profit margin badges
 * @param margin - Profit margin percentage
 * @returns Badge variant string
 */
export const getProfitMarginVariant = (margin: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (margin >= 30) return 'default' // Green for good margins
  if (margin >= 15) return 'secondary' // Blue for acceptable margins
  if (margin >= 5) return 'outline' // Gray for low margins
  return 'destructive' // Red for very low/negative margins
}

/**
 * Gets the variant class for rental badges
 * @param rental - Rental amount
 * @returns Badge variant string
 */
export const getRentalVariant = (rental: number): 'default' | 'secondary' | 'outline' => {
  if (rental >= 1000) return 'default' // Green for high rental
  if (rental >= 500) return 'secondary' // Blue for medium rental
  return 'outline' // Gray for low rental
}

/**
 * Validates if a quantity is within acceptable limits
 * @param quantity - The quantity to validate
 * @param min - Minimum allowed value (default: 1)
 * @param max - Maximum allowed value (default: 1000)
 * @returns Validation result object
 */
export const validateQuantity = (
  quantity: number, 
  min: number = 1, 
  max: number = 1000
): { isValid: boolean; error?: string } => {
  if (isNaN(quantity)) {
    return { isValid: false, error: 'La cantidad debe ser un número válido' }
  }
  
  if (quantity < min) {
    return { isValid: false, error: `La cantidad debe ser mayor o igual a ${min}` }
  }
  
  if (quantity > max) {
    return { isValid: false, error: `La cantidad no puede ser mayor a ${max}` }
  }
  
  return { isValid: true }
}

/**
 * Formats a date to a readable string in Spanish
 * @param date - The date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Generates a unique identifier for temporary items
 * @returns Unique string identifier
 */
export const generateTempId = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Groups items by a specified key
 * @param items - Array of items to group
 * @param key - Key to group by
 * @returns Grouped items object
 */
export const groupBy = <T, K extends keyof T>(
  items: T[],
  key: K
): Record<string, T[]> => {
  return items.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

/**
 * Sorts items by multiple criteria
 * @param items - Array of items to sort
 * @param sortBy - Array of sort criteria
 * @returns Sorted items array
 */
export const multiSort = <T>(
  items: T[],
  sortBy: Array<{ key: keyof T; direction: 'asc' | 'desc' }>
): T[] => {
  return [...items].sort((a, b) => {
    for (const { key, direction } of sortBy) {
      const aVal = a[key]
      const bVal = b[key]
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
    }
    return 0
  })
}

/**
 * Calculates statistics for a group of items
 * @param items - Array of PlantillaEquipoItem
 * @returns Statistics object
 */
export const calculateItemStatistics = (items: PlantillaEquipoItem[]) => {
  const totalItems = items.length
  const totalQuantity = items.reduce((sum, item) => sum + item.cantidad, 0)
  const totalInternal = calculateTotalInternal(items)
  const totalClient = calculateTotalClient(items)
  const profitMargin = calculateProfitMargin(items)
  const rental = calculateRental(totalClient)
  
  const averageUnitPrice = totalItems > 0 ? totalClient / totalQuantity : 0
  const averageItemCost = totalItems > 0 ? totalClient / totalItems : 0
  
  return {
    totalItems,
    totalQuantity,
    totalInternal,
    totalClient,
    profitMargin,
    rental,
    averageUnitPrice,
    averageItemCost
  }
}
