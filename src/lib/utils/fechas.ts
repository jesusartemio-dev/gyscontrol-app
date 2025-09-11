// ===================================================
// 📁 Archivo: fechas.ts
// 📌 Ubicación: src/lib/utils/fechas.ts
// 🔧 Descripción: Utilidades para manejo de fechas de seguimiento
//
// 🧠 Uso: Funciones para cálculo, formateo y análisis de fechas
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

/**
 * Calcula los días restantes hasta una fecha específica
 * @param fecha - Fecha objetivo
 * @returns Número de días (positivo = futuro, negativo = pasado)
 */
export function calcularDiasRestantes(fecha: Date): number {
  if (!fecha || isNaN(fecha.getTime())) {
    return 0
  }
  
  const ahora = new Date()
  const fechaObjetivo = new Date(fecha)
  
  // Normalizar a medianoche para comparación de días completos
  ahora.setHours(0, 0, 0, 0)
  fechaObjetivo.setHours(0, 0, 0, 0)
  
  const diferenciaMilisegundos = fechaObjetivo.getTime() - ahora.getTime()
  const diferenciaDias = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24))
  
  return diferenciaDias
}

/**
 * Determina el estado de tiempo basado en días restantes
 * @param diasRestantes - Número de días hasta la fecha
 * @returns Estado del tiempo ('vencido', 'proximo_vencimiento', 'a_tiempo')
 */
export function getEstadoTiempo(diasRestantes: number): 'vencido' | 'proximo_vencimiento' | 'a_tiempo' {
  if (diasRestantes < 0) {
    return 'vencido'
  }
  
  if (diasRestantes <= 7) {
    return 'proximo_vencimiento'
  }
  
  return 'a_tiempo'
}

/**
 * Formatea una fecha en formato legible
 * @param fecha - Fecha a formatear
 * @param formato - Formato deseado (por defecto: 'dd/mm/yyyy')
 * @returns Fecha formateada como string
 */
export function formatearFecha(fecha: Date, formato: string = 'dd/mm/yyyy'): string {
  if (!fecha || isNaN(fecha.getTime())) {
    return 'Fecha inválida'
  }
  
  const dia = fecha.getDate().toString().padStart(2, '0')
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const año = fecha.getFullYear()
  
  switch (formato) {
    case 'yyyy-mm-dd':
      return `${año}-${mes}-${dia}`
    case 'dd/mm/yyyy':
    default:
      return `${dia}/${mes}/${año}`
  }
}

/**
 * Formatea una fecha de manera relativa (ej: "Hace 2 días", "En 3 días")
 * @param fecha - Fecha a formatear
 * @returns Fecha formateada de manera relativa
 */
export function formatearFechaRelativa(fecha: Date): string {
  if (!fecha || isNaN(fecha.getTime())) {
    return 'Fecha inválida'
  }
  
  const diasRestantes = calcularDiasRestantes(fecha)
  
  if (diasRestantes === 0) {
    return 'Hoy'
  }
  
  if (diasRestantes === 1) {
    return 'Mañana'
  }
  
  if (diasRestantes === -1) {
    return 'Ayer'
  }
  
  if (diasRestantes > 1 && diasRestantes <= 7) {
    return `En ${diasRestantes} días`
  }
  
  if (diasRestantes < -1 && diasRestantes >= -7) {
    return `Hace ${Math.abs(diasRestantes)} días`
  }
  
  // Para fechas más lejanas, mostrar fecha completa
  return formatearFecha(fecha)
}

/**
 * Obtiene el color del badge según el estado de tiempo
 * @param estado - Estado del tiempo
 * @returns Variante del badge
 */
export function getBadgeVariant(estado: 'vencido' | 'proximo_vencimiento' | 'a_tiempo'): 'destructive' | 'secondary' | 'default' {
  switch (estado) {
    case 'vencido':
      return 'destructive'
    case 'proximo_vencimiento':
      return 'secondary'
    case 'a_tiempo':
    default:
      return 'default'
  }
}

/**
 * Obtiene el texto descriptivo según el estado de tiempo
 * @param diasRestantes - Días restantes
 * @param estado - Estado del tiempo
 * @returns Texto descriptivo
 */
export function getTextoEstado(diasRestantes: number, estado: 'vencido' | 'proximo_vencimiento' | 'a_tiempo'): string {
  switch (estado) {
    case 'vencido':
      return `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) !== 1 ? 's' : ''}`
    case 'proximo_vencimiento':
      if (diasRestantes === 0) {
        return 'Vence hoy'
      }
      return `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`
    case 'a_tiempo':
    default:
      return `${diasRestantes} días restantes`
  }
}

// ===================================================
// 🔄 Alias para compatibilidad
// ===================================================

/**
 * Alias para formatearFechaRelativa (compatibilidad con imports en inglés)
 * @param fecha - Fecha a formatear
 * @returns Fecha formateada de forma relativa
 */
export const formatDateRelative = formatearFechaRelativa
