import { propuestaActividadesSchema } from '@/lib/validators/cronogramaIA'

function tarea(overrides: Record<string, unknown> = {}) {
  return {
    catalogoServicioId: 's1',
    nombre: 'Tarea X',
    cantidad: 1,
    nivelDificultad: 1,
    horaBase: 4,
    horaRepetido: 0,
    horasEstimadas: 4,
    incluida: true,
    orden: 0,
    ...overrides,
  }
}

function actividad(overrides: Record<string, unknown> = {}) {
  return {
    edtNombre: 'PRO',
    actividadNombre: 'Cables',
    tareas: [tarea()],
    origen: 'ia',
    ...overrides,
  }
}

describe('propuestaActividadesSchema — nunca rechaza un estado real del Paso 2 (bug real: 400 al Aplicar al Cronograma)', () => {
  it('tolera una Actividad con tareas: [] (esquema elegido sin tareas asignadas)', () => {
    const r = propuestaActividadesSchema.safeParse([actividad({ tareas: [] })])
    expect(r.success).toBe(true)
  })

  it('tolera una Actividad con todas sus tareas destildadas (incluida: false) sin vaciar el array', () => {
    const r = propuestaActividadesSchema.safeParse([
      actividad({ tareas: [tarea({ incluida: false }), tarea({ incluida: false, catalogoServicioId: 's2' })] }),
    ])
    expect(r.success).toBe(true)
  })

  it('tolera una tarea propuesta por IA (esPropuestaIA) con catalogoServicioId null — causa raíz confirmada del 400 real', () => {
    const r = propuestaActividadesSchema.safeParse([
      actividad({
        tareas: [tarea({ catalogoServicioId: null, esPropuestaIA: true, justificacion: 'el alcance lo evidencia', incluida: false })],
      }),
    ])
    expect(r.success).toBe(true)
  })

  it('preserva esPropuestaIA/justificacion/orden en el resultado parseado (antes se descartaban en silencio)', () => {
    const r = propuestaActividadesSchema.safeParse([
      actividad({ tareas: [tarea({ catalogoServicioId: null, esPropuestaIA: true, justificacion: 'x', orden: 7 })] }),
    ])
    expect(r.success).toBe(true)
    if (r.success) {
      const t = r.data[0].tareas[0]
      expect(t.esPropuestaIA).toBe(true)
      expect(t.justificacion).toBe('x')
      expect(t.orden).toBe(7)
    }
  })

  it('sigue rechazando un catalogoServicioId vacío (string vacía no es un id válido)', () => {
    const r = propuestaActividadesSchema.safeParse([actividad({ tareas: [tarea({ catalogoServicioId: '' })] })])
    expect(r.success).toBe(false)
  })
})
