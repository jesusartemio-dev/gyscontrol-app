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
 * @param currency - Código de moneda (default: 'USD')
 * @returns String formateado como moneda compacta
 */
export const formatCurrencyCompact = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat(getMonedaLocale(currency), {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(amount)
}

/**
 * Obtiene el símbolo de moneda
 */
export const getMonedaSymbol = (moneda?: string | null): string => {
  switch (moneda) {
    case 'PEN': return 'S/'
    case 'EUR': return '€'
    default: return '$'
  }
}

/**
 * Obtiene el locale apropiado para una moneda
 */
export const getMonedaLocale = (moneda?: string | null): string => {
  switch (moneda) {
    case 'PEN': return 'es-PE'
    case 'EUR': return 'de-DE'
    default: return 'en-US'
  }
}

/**
 * Formatea un monto con la moneda correcta (shorthand)
 * @param amount - El monto a formatear
 * @param moneda - Código de moneda: 'USD', 'PEN', 'EUR'
 */
export const formatMoneda = (amount: number, moneda?: string | null): string => {
  const currency = moneda || 'USD'
  return new Intl.NumberFormat(getMonedaLocale(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Formatea un monto sin símbolo de moneda (solo números con separadores)
 */
export const formatMonedaCompact = (amount: number, moneda?: string | null): string => {
  return amount.toLocaleString(getMonedaLocale(moneda), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Convierte un monto USD a la moneda de display y lo formatea.
 * Items se almacenan siempre en USD; esta función aplica tipoCambio cuando moneda !== 'USD'.
 */
export const toDisplayAmount = (amountUSD: number, moneda?: string | null, tipoCambio?: number | null): number => {
  if (!moneda || moneda === 'USD' || !tipoCambio) return amountUSD
  return amountUSD * tipoCambio
}

/**
 * Convierte un monto USD a la moneda de display y lo formatea con símbolo.
 */
export const formatDisplayCurrency = (amountUSD: number, moneda?: string | null, tipoCambio?: number | null): string => {
  return formatMoneda(toDisplayAmount(amountUSD, moneda, tipoCambio), moneda)
}

/**
 * Convierte un monto USD a la moneda de display y lo formatea sin símbolo.
 */
export const formatDisplayCompact = (amountUSD: number, moneda?: string | null, tipoCambio?: number | null): string => {
  return formatMonedaCompact(toDisplayAmount(amountUSD, moneda, tipoCambio), moneda)
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
