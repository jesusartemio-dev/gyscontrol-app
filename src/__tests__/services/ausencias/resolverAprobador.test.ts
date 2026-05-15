import { vi } from 'vitest'
import { resolverAprobador1 } from '@/services/ausencias/resolverAprobador'

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function makeTx(overrides: {
  empleado?: { findUnique?: any }
  personalProyecto?: { findMany?: any }
  user?: { findFirst?: any }
} = {}) {
  return {
    empleado: { findUnique: vi.fn(), ...overrides.empleado },
    personalProyecto: { findMany: vi.fn(), ...overrides.personalProyecto },
    user: { findFirst: vi.fn(), ...overrides.user },
  } as any
}

const SOLICITANTE = 'user-solicitante'
const RESPONSABLE = 'user-responsable'
const LIDER = 'user-lider'
const ADMIN = 'user-admin'

const fecha = (iso: string) => new Date(iso + 'T00:00:00.000Z')
const INICIO = fecha('2026-06-01')
const FIN = fecha('2026-06-05')

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('resolverAprobador1', () => {
  it('Nivel 1: resuelve departamento.responsable diferente al solicitante', async () => {
    const tx = makeTx({
      empleado: {
        findUnique: vi.fn().mockResolvedValue({
          departamento: { responsableId: RESPONSABLE },
        }),
      },
    })

    const result = await resolverAprobador1(SOLICITANTE, INICIO, FIN, tx)
    expect(result).toEqual({ aprobador1Id: RESPONSABLE, via: 'departamento' })
    expect(tx.personalProyecto.findMany).not.toHaveBeenCalled()
  })

  it('Nivel 1 salta si el solicitante ES el responsable → intenta nivel 2', async () => {
    const tx = makeTx({
      empleado: {
        findUnique: vi.fn().mockResolvedValue({
          departamento: { responsableId: SOLICITANTE }, // misma persona
        }),
      },
      personalProyecto: {
        findMany: vi.fn().mockResolvedValue([
          {
            proyecto: {
              liderId: LIDER,
              fechaInicio: fecha('2026-01-01'),
              fechaFin: fecha('2026-12-31'),
              createdAt: fecha('2026-01-01'),
            },
          },
        ]),
      },
    })

    const result = await resolverAprobador1(SOLICITANTE, INICIO, FIN, tx)
    expect(result).toEqual({ aprobador1Id: LIDER, via: 'proyecto' })
  })

  it('Nivel 2: resuelve proyecto.lider con fechas solapadas', async () => {
    const tx = makeTx({
      empleado: { findUnique: vi.fn().mockResolvedValue(null)},
      personalProyecto: {
        findMany: vi.fn().mockResolvedValue([
          {
            proyecto: {
              liderId: LIDER,
              fechaInicio: fecha('2026-01-01'),
              fechaFin: fecha('2026-12-31'),
              createdAt: fecha('2026-01-01'),
            },
          },
        ]),
      },
    })

    const result = await resolverAprobador1(SOLICITANTE, INICIO, FIN, tx)
    expect(result).toEqual({ aprobador1Id: LIDER, via: 'proyecto' })
    expect(tx.user.findFirst).not.toHaveBeenCalled()
  })

  it('Nivel 2 salta si el solicitante ES el lider → intenta nivel 3', async () => {
    const tx = makeTx({
      empleado: { findUnique: vi.fn().mockResolvedValue(null)},
      personalProyecto: {
        findMany: vi.fn().mockResolvedValue([
          {
            proyecto: {
              liderId: SOLICITANTE, // misma persona
              fechaInicio: fecha('2026-01-01'),
              fechaFin: fecha('2026-12-31'),
              createdAt: fecha('2026-01-01'),
            },
          },
        ]),
      },
      user: { findFirst: vi.fn().mockResolvedValue({ id: ADMIN })},
    })

    const result = await resolverAprobador1(SOLICITANTE, INICIO, FIN, tx)
    expect(result).toEqual({ aprobador1Id: ADMIN, via: 'administracion' })
  })

  it('Nivel 2 salta proyectos cuyas fechas no solapan con la ausencia → nivel 3', async () => {
    const tx = makeTx({
      empleado: { findUnique: vi.fn().mockResolvedValue(null)},
      personalProyecto: {
        findMany: vi.fn().mockResolvedValue([
          {
            proyecto: {
              liderId: LIDER,
              fechaInicio: fecha('2026-01-01'),
              fechaFin: fecha('2026-05-01'), // termina antes que la ausencia
              createdAt: fecha('2026-01-01'),
            },
          },
        ]),
      },
      user: { findFirst: vi.fn().mockResolvedValue({ id: ADMIN })},
    })

    const result = await resolverAprobador1(SOLICITANTE, INICIO, FIN, tx)
    expect(result).toEqual({ aprobador1Id: ADMIN, via: 'administracion' })
  })

  it('Nivel 3: resuelve administracion cuando no hay departamento ni proyecto', async () => {
    const tx = makeTx({
      empleado: { findUnique: vi.fn().mockResolvedValue(null)},
      personalProyecto: { findMany: vi.fn().mockResolvedValue([])},
      user: { findFirst: vi.fn().mockResolvedValue({ id: ADMIN })},
    })

    const result = await resolverAprobador1(SOLICITANTE, INICIO, FIN, tx)
    expect(result).toEqual({ aprobador1Id: ADMIN, via: 'administracion' })
  })

  it('Sin resolución: empleado es el único admin → requiereAsignacion=true', async () => {
    const tx = makeTx({
      empleado: { findUnique: vi.fn().mockResolvedValue(null)},
      personalProyecto: { findMany: vi.fn().mockResolvedValue([])},
      user: { findFirst: vi.fn().mockResolvedValue(null)}, // no other admin
    })

    const result = await resolverAprobador1(SOLICITANTE, INICIO, FIN, tx)
    expect(result).toEqual({ aprobador1Id: null, requiereAsignacion: true })
  })

  it('Proyecto con fechaFin=null cuenta como indefinidamente activo (solapa)', async () => {
    const tx = makeTx({
      empleado: { findUnique: vi.fn().mockResolvedValue(null)},
      personalProyecto: {
        findMany: vi.fn().mockResolvedValue([
          {
            proyecto: {
              liderId: LIDER,
              fechaInicio: fecha('2025-01-01'),
              fechaFin: null, // sin fecha fin → activo indefinidamente
              createdAt: fecha('2025-01-01'),
            },
          },
        ]),
      },
    })

    const result = await resolverAprobador1(SOLICITANTE, INICIO, FIN, tx)
    expect(result).toEqual({ aprobador1Id: LIDER, via: 'proyecto' })
  })
})
