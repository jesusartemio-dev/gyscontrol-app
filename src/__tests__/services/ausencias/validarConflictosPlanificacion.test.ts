import { validarConflictosPlanificacion } from '@/services/ausencias/validarConflictosPlanificacion'
import { TurnoDia } from '@prisma/client'

// Minimal tx mock factory
function makeTx(overrides: Record<string, any> = {}) {
  return {
    calendarioLaboral: { findFirst: jest.fn().mockResolvedValue(null) },
    excepcionCalendario: { findMany: jest.fn().mockResolvedValue([]) },
    planificacionDia: { findMany: jest.fn().mockResolvedValue([]) },
    proyecto: { findUnique: jest.fn().mockResolvedValue(null) },
    ...overrides,
  } as unknown as Parameters<typeof validarConflictosPlanificacion>[6]
}

// Helper: local midnight Date (avoids UTC shift in UTC-5 timezone)
function d(iso: string) {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(y, m - 1, day)
}

describe('validarConflictosPlanificacion', () => {
  const userId = 'user-1'

  it('sin conflictos → array vacío', async () => {
    const tx = makeTx({
      planificacionDia: { findMany: jest.fn().mockResolvedValue([]) },
    })

    const result = await validarConflictosPlanificacion(
      userId,
      d('2026-05-18'), // lunes
      d('2026-05-20'), // miércoles
      'dia_completo',
      'dia_completo',
      false,
      tx,
    )

    expect(result).toEqual([])
  })

  it('2 conflictos en días distintos → array con 2 elementos enriquecidos', async () => {
    const planificacionRows = [
      {
        id: 'plan-1',
        fecha: d('2026-05-18'),
        turno: 'dia_completo' as TurnoDia,
        proyectoId: 'proj-A',
      },
      {
        id: 'plan-2',
        fecha: d('2026-05-19'),
        turno: 'dia_completo' as TurnoDia,
        proyectoId: 'proj-B',
      },
    ]

    const proyectoFindUnique = jest.fn()
      .mockResolvedValueOnce({ id: 'proj-A', codigo: 'PA-001', nombre: 'Proyecto Alpha' })
      .mockResolvedValueOnce({ id: 'proj-B', codigo: 'PB-002', nombre: 'Proyecto Beta' })

    const tx = makeTx({
      planificacionDia: { findMany: jest.fn().mockResolvedValue(planificacionRows) },
      proyecto: { findUnique: proyectoFindUnique },
    })

    const result = await validarConflictosPlanificacion(
      userId,
      d('2026-05-18'),
      d('2026-05-20'),
      'dia_completo',
      'dia_completo',
      false,
      tx,
    )

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      fecha: '2026-05-18',
      turno: 'dia_completo',
      planificacionDiaId: 'plan-1',
      proyectoId: 'proj-A',
      proyectoCodigo: 'PA-001',
      proyectoNombre: 'Proyecto Alpha',
    })
    expect(result[1]).toEqual({
      fecha: '2026-05-19',
      turno: 'dia_completo',
      planificacionDiaId: 'plan-2',
      proyectoId: 'proj-B',
      proyectoCodigo: 'PB-002',
      proyectoNombre: 'Proyecto Beta',
    })
  })

  it('conflicto en fin de semana con aplicaFinDeSemana=false → no aparece', async () => {
    // 2026-05-16 es sábado, 2026-05-17 es domingo
    // Solicitud: viernes 15 a lunes 18 (aplicaFinDeSemana=false)
    // Fila en planificacion_dia para el sábado 16 → no debe aparecer en conflictos
    const planificacionRows = [
      {
        id: 'plan-sat',
        fecha: d('2026-05-16'), // sábado
        turno: 'dia_completo' as TurnoDia,
        proyectoId: 'proj-X',
      },
    ]

    const tx = makeTx({
      planificacionDia: { findMany: jest.fn().mockResolvedValue(planificacionRows) },
    })

    const result = await validarConflictosPlanificacion(
      userId,
      d('2026-05-15'), // viernes
      d('2026-05-18'), // lunes
      'dia_completo',
      'dia_completo',
      false, // NO aplica fines de semana
      tx,
    )

    // Días hábiles: viernes 15, lunes 18. Sábado 16 queda fuera.
    // La fila del sábado está en planificacionDia.findMany pero como la consulta
    // filtra por fechas en diasLista, y sábado no está en diasLista → no hay conflicto.
    expect(result).toEqual([])
  })
})
