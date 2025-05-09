// ===================================================
// 📁 Archivo: recalculoCatalogoServicio.ts
// 📉 Ubicación: src/lib/utils/
// 🔧 Descripción: Funciones de recalculo para entidades CatalogoServicio
// 🧐 Uso: Recalcula horaTotal, costoInterno y costoCliente al importar servicios.
// ✍️ Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-26
// ===================================================

import { calcularHoras } from '@/lib/utils/formulas'

interface ServicioBasico {
  formula: 'Fijo' | 'Proporcional' | 'Escalonada'
  cantidad: number
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  costoHora: number
  factorSeguridad: number
  margen: number
}

/**
 * Recalcula las horas, costo interno y costo cliente de un servicio.
 * @param servicio Datos de entrada del servicio
 * @returns Objeto con horaTotal, costoInterno y costoCliente
 */
export function recalcularServicio(servicio: ServicioBasico) {
  const horaTotal = calcularHoras({
    formula: servicio.formula,
    cantidad: servicio.cantidad,
    horaBase: servicio.horaBase,
    horaRepetido: servicio.horaRepetido,
    horaUnidad: servicio.horaUnidad,
    horaFijo: servicio.horaFijo,
  })

  const costoInterno = +(horaTotal * servicio.costoHora * servicio.factorSeguridad).toFixed(2)
  const costoCliente = +(costoInterno * servicio.margen).toFixed(2)

  return { horaTotal, costoInterno, costoCliente }
}

/**
 * Recalcula una lista completa de servicios.
 * @param servicios Array de servicios
 * @returns Lista de servicios con valores actualizados
 */
export function recalcularListaServicios<T extends ServicioBasico & Record<string, any>>(servicios: T[]): T[] {
  return servicios.map(servicio => {
    const { horaTotal, costoInterno, costoCliente } = recalcularServicio(servicio)
    return {
      ...servicio,
      horaTotal,
      costoInterno,
      costoCliente,
    }
  })
}
