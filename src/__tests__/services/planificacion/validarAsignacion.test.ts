import { validarAsignacion } from '@/services/planificacion/validarAsignacion'

// Fecha lunes laboral: 2026-05-25
const FECHA_LUNES = new Date('2026-05-25T00:00:00.000Z')
// Fecha sábado: 2026-05-30
const FECHA_SABADO = new Date('2026-05-30T00:00:00.000Z')

const USER_ID = 'user-test-1'
const PROYECTO_ID = 'proyecto-test-1'

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    empleado: {
      findUnique: jest.fn().mockResolvedValue({ activo: true }),
    },
    proyecto: {
      findUnique: jest.fn().mockResolvedValue({
        estado: 'en_ejecucion',
        fechaInicio: new Date('2026-01-01T00:00:00.000Z'),
        fechaFin: new Date('2026-12-31T00:00:00.000Z'),
      }),
    },
    planificacionDia: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    personalProyecto: {
      findFirst: jest.fn().mockResolvedValue({ id: 'pp-1' }),
    },
    ...overrides,
  } as any
}

describe('validarAsignacion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('caso feliz → válido, sin errores ni warnings', async () => {
    const tx = makeTx()
    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES,
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(true)
    expect(result.errores).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('empleado inactivo → error empleado_no_activo, retorna inmediatamente', async () => {
    const tx = makeTx({
      empleado: {
        findUnique: jest.fn().mockResolvedValue({ activo: false }),
      },
    })

    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES,
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(false)
    expect(result.errores).toHaveLength(1)
    expect(result.errores[0].codigo).toBe('empleado_no_activo')
    // No debe consultar proyecto si el empleado no está activo
    expect(tx.proyecto.findUnique).not.toHaveBeenCalled()
  })

  it('empleado no encontrado → error empleado_no_activo', async () => {
    const tx = makeTx({
      empleado: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    })

    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES,
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(false)
    expect(result.errores[0].codigo).toBe('empleado_no_activo')
  })

  it('proyecto cerrado → error proyecto_no_activo', async () => {
    const tx = makeTx({
      proyecto: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'cerrado',
          fechaInicio: new Date('2026-01-01T00:00:00.000Z'),
          fechaFin: new Date('2026-06-30T00:00:00.000Z'),
        }),
      },
    })

    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES,
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(false)
    expect(result.errores).toHaveLength(1)
    expect(result.errores[0].codigo).toBe('proyecto_no_activo')
  })

  it('proyecto pausado → error proyecto_no_activo', async () => {
    const tx = makeTx({
      proyecto: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'pausado',
          fechaInicio: new Date('2026-01-01T00:00:00.000Z'),
          fechaFin: null,
        }),
      },
    })

    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES,
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(false)
    expect(result.errores[0].codigo).toBe('proyecto_no_activo')
  })

  it('fecha anterior a fechaInicio del proyecto → error fecha_fuera_de_rango_proyecto', async () => {
    const tx = makeTx({
      proyecto: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'en_ejecucion',
          fechaInicio: new Date('2026-06-01T00:00:00.000Z'), // inicio futuro
          fechaFin: new Date('2026-12-31T00:00:00.000Z'),
        }),
      },
    })

    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES, // 2026-05-25, antes del 2026-06-01
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(false)
    expect(result.errores).toHaveLength(1)
    expect(result.errores[0].codigo).toBe('fecha_fuera_de_rango_proyecto')
    expect(result.errores[0].mensaje).toContain('anterior al inicio')
  })

  it('fecha posterior a fechaFin del proyecto → error fecha_fuera_de_rango_proyecto', async () => {
    const tx = makeTx({
      proyecto: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'en_ejecucion',
          fechaInicio: new Date('2026-01-01T00:00:00.000Z'),
          fechaFin: new Date('2026-03-31T00:00:00.000Z'), // ya terminó
        }),
      },
    })

    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES, // 2026-05-25, después del 2026-03-31
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(false)
    expect(result.errores[0].codigo).toBe('fecha_fuera_de_rango_proyecto')
    expect(result.errores[0].mensaje).toContain('posterior al fin')
  })

  it('ausencia aprobada en esa fecha+turno → error conflicto_ausencia con detalle', async () => {
    const ausenciaCell = {
      id: 'planif-1',
      solicitudAusenciaId: 'sol-aus-1',
      solicitudAusencia: {
        id: 'sol-aus-1',
        estado: 'aprobada',
        tipoAusencia: { nombre: 'Vacaciones' },
      },
    }

    const tx = makeTx({
      planificacionDia: {
        findFirst: jest.fn().mockResolvedValue(ausenciaCell),
      },
    })

    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES,
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(false)
    expect(result.errores).toHaveLength(1)
    expect(result.errores[0].codigo).toBe('conflicto_ausencia')
    expect(result.errores[0].detalle).toMatchObject({
      solicitudAusenciaId: 'sol-aus-1',
      tipo: 'Vacaciones',
      estado: 'aprobada',
    })
  })

  it('sábado sin esExcepcional → error fin_de_semana_no_excepcional', async () => {
    const tx = makeTx()

    const result = await validarAsignacion(
      USER_ID,
      FECHA_SABADO,
      'dia_completo',
      PROYECTO_ID,
      false, // esExcepcional = false
      tx,
    )

    expect(result.valido).toBe(false)
    expect(result.errores).toHaveLength(1)
    expect(result.errores[0].codigo).toBe('fin_de_semana_no_excepcional')
  })

  it('sábado con esExcepcional=true → válido', async () => {
    const tx = makeTx()

    const result = await validarAsignacion(
      USER_ID,
      FECHA_SABADO,
      'dia_completo',
      PROYECTO_ID,
      true, // esExcepcional = true
      tx,
    )

    expect(result.valido).toBe(true)
    expect(result.errores).toHaveLength(0)
  })

  it('empleado no en PersonalProyecto → válido pero warning persona_no_en_proyecto', async () => {
    const tx = makeTx({
      personalProyecto: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    })

    const result = await validarAsignacion(
      USER_ID,
      FECHA_LUNES,
      'dia_completo',
      PROYECTO_ID,
      false,
      tx,
    )

    expect(result.valido).toBe(true)
    expect(result.errores).toHaveLength(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].codigo).toBe('persona_no_en_proyecto')
  })

  describe('conflictos de turno', () => {
    it('turno am con ausencia dia_completo → conflicto', async () => {
      const ausenciaCell = {
        id: 'planif-2',
        solicitudAusenciaId: 'sol-2',
        solicitudAusencia: {
          id: 'sol-2',
          estado: 'aprobada',
          tipoAusencia: { nombre: 'Permiso' },
        },
      }

      const tx = makeTx({
        planificacionDia: {
          // se llama con turno: { in: ['dia_completo', 'am'] }
          findFirst: jest.fn().mockResolvedValue(ausenciaCell),
        },
      })

      const result = await validarAsignacion(
        USER_ID,
        FECHA_LUNES,
        'am',
        PROYECTO_ID,
        false,
        tx,
      )

      expect(result.valido).toBe(false)
      expect(result.errores[0].codigo).toBe('conflicto_ausencia')
    })

    it('turno pm sin ausencia pm → válido', async () => {
      const tx = makeTx({
        planificacionDia: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      })

      const result = await validarAsignacion(
        USER_ID,
        FECHA_LUNES,
        'pm',
        PROYECTO_ID,
        false,
        tx,
      )

      expect(result.valido).toBe(true)
    })
  })
})
