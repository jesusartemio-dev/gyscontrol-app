import { z } from 'zod'
import { batchAsignar, type AsignacionInput } from '@/services/planificacion/batchAsignar'

// Reproduce the schema constraint from the route so we can test the >50 guard
const MAX_BATCH = 50
const BatchItemSchema = z.object({
  userId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  turno: z.enum(['dia_completo']),
  proyectoId: z.string().min(1),
  esExcepcional: z.boolean().default(false),
  notas: z.string().nullable().optional(),
})
const BatchSchema = z.object({ asignaciones: z.array(BatchItemSchema).min(1).max(MAX_BATCH) })

const CREATED_BY = 'user-admin-1'
const PROYECTO_ID = 'proyecto-test-1'
const USER_ID = 'user-test-1'

// Monday 2026-05-25 … Friday 2026-05-29 (all weekdays)
function makeWeekItems(n = 5): AsignacionInput[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: USER_ID,
    fecha: new Date(Date.UTC(2026, 4, 25 + i)).toISOString().slice(0, 10),
    turno: 'dia_completo' as const,
    proyectoId: PROYECTO_ID,
    esExcepcional: false,
  }))
}

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
      create: jest.fn().mockImplementation(() => Promise.resolve({ id: 'new-id-' + Math.random() })),
      update: jest.fn().mockImplementation(() => Promise.resolve({ id: 'upd-id-' + Math.random() })),
    },
    personalProyecto: {
      findFirst: jest.fn().mockResolvedValue({ id: 'pp-1' }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  } as any
}

describe('batchAsignar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('batch limpio de 5 celdas → 5 creadas, 0 omitidas', async () => {
    const tx = makeTx()
    const result = await batchAsignar(makeWeekItems(5), CREATED_BY, tx)

    expect(result.creadas).toBe(5)
    expect(result.actualizadas).toBe(0)
    expect(result.omitidas).toHaveLength(0)
    expect(tx.planificacionDia.create).toHaveBeenCalledTimes(5)
  })

  it('batch con 2 ausencias → 3 creadas, 2 omitidas con razon conflicto_ausencia', async () => {
    const ausenciaCell = {
      id: 'cell-aus',
      solicitudAusenciaId: 'sol-1',
      solicitudAusencia: {
        id: 'sol-1',
        estado: 'aprobada',
        tipoAusencia: { nombre: 'Vacaciones' },
      },
    }

    // findFirst returns ausencia for the first 2 calls (dates), null for the rest
    let ausenciaCallCount = 0
    const tx = makeTx({
      planificacionDia: {
        findFirst: jest.fn().mockImplementation(() => {
          // validarAsignacion calls findFirst for ausencia check
          // We make the first 2 items fail with ausencia
          ausenciaCallCount++
          if (ausenciaCallCount <= 2) return Promise.resolve(ausenciaCell)
          return Promise.resolve(null)
        }),
        create: jest.fn().mockResolvedValue({ id: 'created-id' }),
        update: jest.fn().mockResolvedValue({ id: 'updated-id' }),
      },
    })

    const result = await batchAsignar(makeWeekItems(5), CREATED_BY, tx)

    expect(result.omitidas).toHaveLength(2)
    expect(result.omitidas[0].razon).toBe('conflicto_ausencia')
    expect(result.omitidas[1].razon).toBe('conflicto_ausencia')
    expect(result.creadas).toBe(3)
  })

  it('batch con 2 ausencias tiene 2 entradas con fecha correcta en omitidas', async () => {
    const items = makeWeekItems(3)
    // Simulate employee inactive for items[1]
    let callIdx = 0
    const tx = makeTx({
      empleado: {
        findUnique: jest.fn().mockImplementation(() => {
          callIdx++
          if (callIdx === 2) return Promise.resolve({ activo: false })
          return Promise.resolve({ activo: true })
        }),
      },
    })

    const result = await batchAsignar(items, CREATED_BY, tx)

    expect(result.omitidas).toHaveLength(1)
    expect(result.omitidas[0].razon).toBe('empleado_no_activo')
    expect(result.omitidas[0].fecha).toBe(items[1].fecha)
    expect(result.omitidas[0].userId).toBe(USER_ID)
    expect(result.creadas).toBe(2)
  })

  it('batch donde DB lanza error de constraint → propaga el error (causa rollback en transacción)', async () => {
    const constraintError = Object.assign(new Error('Unique constraint violation'), {
      code: 'P2002',
      name: 'PrismaClientKnownRequestError',
    })

    const tx = makeTx({
      planificacionDia: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(constraintError),
        update: jest.fn().mockResolvedValue({ id: 'id' }),
      },
    })

    await expect(batchAsignar(makeWeekItems(1), CREATED_BY, tx)).rejects.toThrow(
      'Unique constraint violation',
    )
  })

  it('batch con celdas ya existentes del mismo proyecto → 0 creadas, N actualizadas', async () => {
    const existente = { id: 'existing-celda', solicitudAusenciaId: null }
    // validarAsignacion calls findFirst for ausencia check (returns null = no ausencia),
    // then batchAsignar calls findFirst for existente check (returns existente).
    // 3 items → 6 findFirst calls total: null, existente, null, existente, null, existente
    const tx = makeTx({
      planificacionDia: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null).mockResolvedValueOnce(existente)
          .mockResolvedValueOnce(null).mockResolvedValueOnce(existente)
          .mockResolvedValueOnce(null).mockResolvedValueOnce(existente),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'existing-celda' }),
      },
    })

    const result = await batchAsignar(makeWeekItems(3), CREATED_BY, tx)

    expect(result.creadas).toBe(0)
    expect(result.actualizadas).toBe(3)
    expect(result.omitidas).toHaveLength(0)
    expect(tx.planificacionDia.create).not.toHaveBeenCalled()
    expect(tx.planificacionDia.update).toHaveBeenCalledTimes(3)
  })

  it('batch con celda existente de ausencia → omitida con razon celda_ausencia', async () => {
    const ausenciaExistente = { id: 'aus-celda', solicitudAusenciaId: 'sol-99' }
    const tx = makeTx({
      planificacionDia: {
        // validarAsignacion.findFirst (ausencia check) returns null, then findFirst (existente check) returns ausencia
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)  // validacion: no ausencia conflict
          .mockResolvedValueOnce(ausenciaExistente),  // existente: is ausencia cell
        create: jest.fn(),
        update: jest.fn(),
      },
    })

    const result = await batchAsignar(makeWeekItems(1), CREATED_BY, tx)

    expect(result.omitidas).toHaveLength(1)
    expect(result.omitidas[0].razon).toBe('celda_ausencia')
    expect(result.creadas).toBe(0)
  })
})

describe('BatchSchema (Zod — máx 50 items)', () => {
  const validItem = {
    userId: USER_ID,
    fecha: '2026-05-25',
    turno: 'dia_completo',
    proyectoId: PROYECTO_ID,
    esExcepcional: false,
  }

  it('acepta batch de exactamente 50 items', () => {
    const result = BatchSchema.safeParse({ asignaciones: Array(50).fill(validItem) })
    expect(result.success).toBe(true)
  })

  it('rechaza batch de 51 items con error Zod', () => {
    const result = BatchSchema.safeParse({ asignaciones: Array(51).fill(validItem) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('too_big')
    }
  })

  it('rechaza batch vacío', () => {
    const result = BatchSchema.safeParse({ asignaciones: [] })
    expect(result.success).toBe(false)
  })
})
