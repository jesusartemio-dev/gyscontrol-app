/**
 * 📅 Utilidades de Formateo de Fechas
 * Funciones centralizadas para el manejo y formateo de fechas
 */

/**
 * Formats a date to a readable string in Spanish
 * @param date - The date to format (Date object or string)
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

/**
 * Formats a date with time to a readable string in Spanish
 * @param date - The date to format (Date object or string)
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

/**
 * Formats a date for input fields (YYYY-MM-DD)
 * @param date - The date to format (Date object or string)
 * @returns Formatted date string for input
 */
export const formatDateForInput = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString().split('T')[0]
}

/**
 * Calculate days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates
 */
export const daysBetween = (startDate: Date | string, endDate: Date | string): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if a date is overdue
 * @param date - Date to check
 * @param referenceDate - Reference date (default: today)
 * @returns True if date is overdue
 */
export const isOverdue = (date: Date | string, referenceDate: Date = new Date()): boolean => {
  const checkDate = typeof date === 'string' ? new Date(date) : date
  return checkDate < referenceDate
}

/**
 * Get relative time string (e.g., "hace 2 días", "en 3 días")
 * @param date - Date to compare
 * @param referenceDate - Reference date (default: today)
 * @returns Relative time string
 */
export const getRelativeTime = (date: Date | string, referenceDate: Date = new Date()): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffDays = Math.ceil((targetDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Mañana'
  if (diffDays === -1) return 'Ayer'
  if (diffDays > 0) return `En ${diffDays} días`
  return `Hace ${Math.abs(diffDays)} días`
}
