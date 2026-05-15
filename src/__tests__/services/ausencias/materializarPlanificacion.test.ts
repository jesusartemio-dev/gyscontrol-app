import { materializarPlanificacion } from '@/services/ausencias/materializarPlanificacion'

// Helper: local midnight Date (avoids UTC shift in UTC-5 timezone)
function d(iso: string) {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(y, m - 1, day)
}

// Build a fully-mocked tx for materializarPlanificacion
function makeTx(solicitudOverride: Partial<ReturnType<typeof baseSolicitud>> = {}, opts: {
  existingRows?: Array<{ id: string; proyectoId: string | null; solicitudAusenciaId: string | null }>
} = {}) {
  const solicitud = { ...baseSolicitud(), ...solicitudOverride }
  const existingRows = opts.existingRows ?? []

  // planificacionDia.findUnique returns rows for the matching userId/fecha/turno
  const findUnique = jest.fn().mockResolvedValue(null) // default: no conflict
  for (const row of existingRows) {
    findUnique.mockResolvedValueOnce(row)
  }

  return {
    solicitudAusencia: {
      findUnique: jest.fn().mockResolvedValue(solicitud),
    },
    calendarioLaboral: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    excepcionCalendario: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    planificacionDia: {
      findUnique,
      create: jest.fn().mockResolvedValue({ id: 'new-cell' }),
      delete: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as unknown as Parameters<typeof materializarPlanificacion>[3]
}

function baseSolicitud() {
  return {
    id: 'sol-1',
    solicitanteId: 'user-1',
    tipoAusenciaId: 'tipo-VAC',
    fechaInicio: d('2026-05-18'), // lunes
    fechaFin: d('2026-05-20'),   // miércoles (3 días hábiles)
    turnoInicio: 'dia_completo',
    turnoFin: 'dia_completo',
    tipoAusencia: {
      aplicaFinDeSemana: false,
    },
  }
}

describe('materializarPlanificacion', () => {
  it('ausencia de 3 días hábiles sin conflictos → crea 3 celdas', async () => {
    const tx = makeTx()
    const result = await materializarPlanificacion('sol-1', {}, 'aprobador-1', tx)

    expect(result.celdasCreadas).toBe(3)
    expect(result.celdasEliminadas).toBe(0)
    expect(tx.planificacionDia.create).toHaveBeenCalledTimes(3)
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })

  it('conflicto con desasignarProyectos=false → lanza error', async () => {
    const conflictRow = { id: 'old-plan', proyectoId: 'proj-X', solicitudAusenciaId: null }
    const tx = makeTx({}, { existingRows: [conflictRow] })

    await expect(
      materializarPlanificacion('sol-1', { desasignarProyectos: false }, 'aprobador-1', tx),
    ).rejects.toThrow('Conflicto no resuelto')
  })

  it('3 días con 1 conflicto y desasignarProyectos=true → crea 3, borra 1, 1 AuditLog', async () => {
    // First call to findUnique (lunes) returns a conflict row; rest return null
    const conflictRow = { id: 'old-plan', proyectoId: 'proj-X', solicitudAusenciaId: null }
    const findUnique = jest.fn()
      .mockResolvedValueOnce(conflictRow) // lunes → conflict
      .mockResolvedValue(null)             // martes, miércoles → free

    const tx = {
      solicitudAusencia: {
        findUnique: jest.fn().mockResolvedValue(baseSolicitud()),
      },
      calendarioLaboral: { findFirst: jest.fn().mockResolvedValue(null) },
      excepcionCalendario: { findMany: jest.fn().mockResolvedValue([]) },
      planificacionDia: {
        findUnique,
        create: jest.fn().mockResolvedValue({ id: 'new-cell' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as Parameters<typeof materializarPlanificacion>[3]

    const result = await materializarPlanificacion('sol-1', { desasignarProyectos: true }, 'aprobador-1', tx)

    expect(result.celdasCreadas).toBe(3)
    expect(result.celdasEliminadas).toBe(1)
    expect(tx.planificacionDia.delete).toHaveBeenCalledWith({ where: { id: 'old-plan' } })
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
    const auditCall = (tx.auditLog.create as jest.Mock).mock.calls[0][0].data
    expect(auditCall.accion).toBe('planificacion.desasignada_por_ausencia')
    expect(tx.planificacionDia.create).toHaveBeenCalledTimes(3)
  })

  it('ausencia con medio día inicial PM → crea celda turno=pm', async () => {
    const solicitud = baseSolicitud()
    solicitud.fechaInicio = d('2026-05-18')
    solicitud.fechaFin = d('2026-05-18') // mismo día
    solicitud.turnoInicio = 'pm'
    solicitud.turnoFin = 'pm'

    const tx = makeTx(solicitud)
    const result = await materializarPlanificacion('sol-1', {}, 'aprobador-1', tx)

    expect(result.celdasCreadas).toBe(1)
    expect(tx.planificacionDia.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ turno: 'pm' }) }),
    )
  })

  it('ausencia MAT (aplicaFinDeSemana=true) en una semana → crea 7 celdas', async () => {
    const solicitud = baseSolicitud()
    solicitud.fechaInicio = d('2026-05-18') // lunes
    solicitud.fechaFin = d('2026-05-24')   // domingo (7 días calendario)
    solicitud.tipoAusencia = { aplicaFinDeSemana: true }

    const tx = makeTx(solicitud)
    const result = await materializarPlanificacion('sol-1', {}, 'aprobador-1', tx)

    expect(result.celdasCreadas).toBe(7)
    expect(result.celdasEliminadas).toBe(0)
  })
})
