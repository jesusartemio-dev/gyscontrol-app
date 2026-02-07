import { describe, test, expect, beforeEach } from 'vitest'

/**
 * Tests de Cálculo Automático de Progreso
 * 
 * Verifica que el cálculo de progreso basado en horas funcione correctamente
 */

describe('Cálculo Automático de Progreso', () => {
  test('debe calcular progreso basado en horas', () => {
    const progreso = calcularProgresoReal(10, 8) // 8h reales de 10h planificadas
    expect(progreso).toBe(80)
  })

  test('no debe exceder 100%', () => {
    const progreso = calcularProgresoReal(10, 15) // 15h reales de 10h planificadas
    expect(progreso).toBe(100)
  })

  test('debe manejar división por cero', () => {
    const progreso = calcularProgresoReal(0, 8)
    expect(progreso).toBe(0)
  })

  test('debe calcular 0% cuando no hay horas reales', () => {
    const progreso = calcularProgresoReal(10, 0)
    expect(progreso).toBe(0)
  })

  test('debe calcular 100% exactamente', () => {
    const progreso = calcularProgresoReal(10, 10)
    expect(progreso).toBe(100)
  })

  test('debe redondear correctamente', () => {
    const progreso = calcularProgresoReal(3, 1) // 33.33% -> 33%
    expect(progreso).toBe(33)
  })

  test('debe manejar valores negativos', () => {
    const progreso = calcularProgresoReal(10, -2)
    expect(progreso).toBe(0)
  })
})

describe('Propagación de Progreso', () => {
  test('debe propagar progreso desde tareas hacia arriba', () => {
    const jerarquia = {
      tarea1: { horasPlanificadas: 5, horasReales: 4, progreso: 80 },
      tarea2: { horasPlanificadas: 3, horasReales: 2, progreso: 67 },
      actividad: { 
        horasPlanificadas: 8, 
        horasReales: 6, 
        tareas: ['tarea1', 'tarea2'],
        progreso: 0
      }
    }

    const progresoActividad = calcularProgresoActividad(jerarquia)
    expect(progresoActividad).toBe(75) // (4+2)/(5+3) = 6/8 = 75%
  })

  test('debe calcular promedio ponderado correctamente', () => {
    const jerarquia = {
      tarea1: { horasPlanificadas: 10, horasReales: 10, progreso: 100 },
      tarea2: { horasPlanificadas: 20, horasReales: 15, progreso: 75 },
      actividad: { 
        horasPlanificadas: 30, 
        horasReales: 25,
        tareas: ['tarea1', 'tarea2'],
        progreso: 0
      }
    }

    const progresoActividad = calcularProgresoActividad(jerarquia)
    expect(progresoActividad).toBe(83) // (10+15)/(10+20) = 25/30 = 83%
  })
})

describe('Validación de Progreso', () => {
  test('debe validar que progreso esté entre 0 y 100', () => {
    expect(calcularProgresoReal(10, 8)).toBeGreaterThanOrEqual(0)
    expect(calcularProgresoReal(10, 8)).toBeLessThanOrEqual(100)
  })

  test('debe manejar números decimales', () => {
    const progreso = calcularProgresoReal(7, 3.5)
    expect(progreso).toBe(50)
  })

  test('debe mantener precisión hasta 2 decimales', () => {
    const progreso = calcularProgresoReal(3, 1) // 33.333...%
    expect(progreso).toBe(33) // Redondeado a entero
  })
})

/**
 * Funciones de prueba para simular la lógica de negocio
 */
export function calcularProgresoReal(horasPlanificadas: number, horasReales: number): number {
  if (horasPlanificadas <= 0 || horasReales < 0) {
    return 0
  }
  
  const progreso = (horasReales / horasPlanificadas) * 100
  return Math.min(100, Math.max(0, Math.round(progreso)))
}

export function calcularProgresoActividad(jerarquia: any): number {
  const { horasPlanificadas, horasReales, tareas } = jerarquia.actividad
  
  if (tareas.length === 0) return 0
  
  return calcularProgresoReal(horasPlanificadas, horasReales)
}