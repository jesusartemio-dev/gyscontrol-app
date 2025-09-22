// ===================================================
// 📁 Archivo: formulas.ts
// 📌 Ubicación: src/lib/utils/formulas.ts
// 🔧 Descripción: Funciones para calcular horas de trabajo según fórmula
//
// 🧠 Uso: Puede ser usado en frontend y backend (función pura)
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-24
// ===================================================

export type TipoFormula = 'Fijo' | 'Proporcional' | 'Escalonada'

/**
 * Calcula el total de horas de trabajo según la fórmula aplicada.
 *
 * @param params - Objeto con parámetros necesarios para calcular las horas
 * @returns Número de horas calculado
 */
export function calcularHoras({
  formula,
  cantidad,
  horaBase = 0,
  horaRepetido = 0,
  horaUnidad = 0,
  horaFijo = 0
}: {
  formula: TipoFormula
  cantidad: number
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
}): number {
  switch (formula) {
    case 'Fijo':
      return horaFijo
    case 'Proporcional':
      return horaUnidad * cantidad
    case 'Escalonada':
      return cantidad <= 1
        ? horaBase + horaFijo
        : horaBase + (cantidad - 1) * horaRepetido + cantidad * horaUnidad + horaFijo
    default:
      return 0
  }
}
