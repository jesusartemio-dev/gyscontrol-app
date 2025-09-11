// 📌 Ubicación: src/lib/utils/currency.ts
// 💰 Utilidades para formateo de moneda

/**
 * Formatea un número como moneda en dólares estadounidenses (USD) por defecto
 * @param amount - El monto a formatear
 * @param options - Opciones adicionales de formateo
 * @returns String formateado como moneda USD
 */
export const formatCurrency = (amount: number, options?: {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
  currency?: string
}): string => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    locale = 'en-US',
    currency = 'USD'
  } = options || {}

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount)
}

/**
 * Formatea un número como moneda compacta (K, M, B)
 * @param amount - El monto a formatear
 * @returns String formateado como moneda USD compacta
 */
export const formatCurrencyCompact = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(amount)
}

/**
 * Convierte un string de moneda a número
 * @param currencyString - String de moneda (ej: "$1,234.56")
 * @returns Número parseado
 */
export const parseCurrency = (currencyString: string): number => {
  const cleanString = currencyString.replace(/[^\d.-]/g, '')
  return parseFloat(cleanString) || 0
}

/**
 * Formatea un porcentaje
 * @param value - Valor del porcentaje
 * @param decimals - Número de decimales (default: 1)
 * @returns String formateado como porcentaje
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}
