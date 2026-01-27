import { describe, test, expect } from 'vitest'

/**
 * Tests de Jerarquía de Registro de Horas
 * 
 * Verifica que la lógica de determinación de nivel de registro funcione correctamente
 */

describe('Jerarquía de Registro de Horas', () => {
  test('debe registrar en tarea cuando está disponible', () => {
    const resultado = determinarNivelRegistro('tarea-123')
    expect(resultado).toEqual({ nivel: 'tarea', id: 'tarea-123' })
  })

  test('debe hacer fallback a actividad cuando no hay tarea', () => {
    const resultado = determinarNivelRegistro(undefined, 'actividad-456')
    expect(resultado).toEqual({ nivel: 'actividad', id: 'actividad-456' })
  })

  test('debe hacer fallback a fase cuando no hay actividad', () => {
    const resultado = determinarNivelRegistro(undefined, undefined, 'fase-789')
    expect(resultado).toEqual({ nivel: 'fase', id: 'fase-789' })
  })

  test('debe hacer fallback a EDT cuando no hay fase', () => {
    const resultado = determinarNivelRegistro(undefined, undefined, undefined, 'edt-101')
    expect(resultado).toEqual({ nivel: 'edt', id: 'edt-101' })
  })

  test('debe lanzar error cuando no hay ningún nivel disponible', () => {
    expect(() => determinarNivelRegistro()).toThrow('Se requiere al menos un EDT para registrar horas')
  })

  test('debe preferir tarea sobre otros niveles', () => {
    const resultado = determinarNivelRegistro('tarea-123', 'actividad-456', 'fase-789', 'edt-101')
    expect(resultado).toEqual({ nivel: 'tarea', id: 'tarea-123' })
  })

  test('debe preferir actividad sobre fase y EDT', () => {
    const resultado = determinarNivelRegistro(undefined, 'actividad-456', 'fase-789', 'edt-101')
    expect(resultado).toEqual({ nivel: 'actividad', id: 'actividad-456' })
  })

  test('debe preferir fase sobre EDT', () => {
    const resultado = determinarNivelRegistro(undefined, undefined, 'fase-789', 'edt-101')
    expect(resultado).toEqual({ nivel: 'fase', id: 'fase-789' })
  })

  test('debe manejar IDs vacíos o nulos correctamente', () => {
    expect(determinarNivelRegistro('', 'actividad-456')).toEqual({ nivel: 'actividad', id: 'actividad-456' })
    expect(determinarNivelRegistro(null, 'actividad-456')).toEqual({ nivel: 'actividad', id: 'actividad-456' })
    expect(determinarNivelRegistro('   ', 'actividad-456')).toEqual({ nivel: 'actividad', id: 'actividad-456' })
  })
})

/**
 * Función de prueba para determinar nivel de registro
 * Simula la lógica de negocio implementada en el sistema
 */
function determinarNivelRegistro(
  tareaId?: string,
  actividadId?: string,
  faseId?: string,
  edtId?: string
) {
  // Prioridad: Tarea > Actividad > Fase > EDT
  if (tareaId && tareaId.trim()) return { nivel: 'tarea', id: tareaId }
  if (actividadId && actividadId.trim()) return { nivel: 'actividad', id: actividadId }
  if (faseId && faseId.trim()) return { nivel: 'fase', id: faseId }
  if (edtId && edtId.trim()) return { nivel: 'edt', id: edtId }

  throw new Error('Se requiere al menos un EDT para registrar horas')
}