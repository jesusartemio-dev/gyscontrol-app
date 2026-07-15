import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

/**
 * Persistencia de las sugerencias de imagen por IA (Bloque 4.2 sesión 4) —
 * mockea prisma. Los jest.fn() se crean DENTRO del factory (sin referenciar
 * variables externas) para evitar el "cannot access before initialization"
 * del hoisting de jest.mock — se recuperan después vía el import ya mockeado.
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    planTrabajoImagen: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    catalogoImagen: {
      findMany: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { aplicarSugerenciasImagenesIA } from '@/lib/planTrabajo/aplicarSugerenciasImagenesIA'

const mockPlanTrabajoImagenFindMany = prisma.planTrabajoImagen.findMany as jest.Mock
const mockPlanTrabajoImagenDeleteMany = prisma.planTrabajoImagen.deleteMany as jest.Mock
const mockPlanTrabajoImagenCreate = prisma.planTrabajoImagen.create as jest.Mock
const mockCatalogoImagenFindMany = prisma.catalogoImagen.findMany as jest.Mock

function estructuraConRechazos(tareaRef: string, rechazadas: string[]): PlanAlcanceDetalladoEdt[] {
  return [
    {
      numeracion: '11.2',
      edtNombre: 'Construcción',
      edtCodigo: 'CON',
      faseNombre: 'EJECUCIÓN',
      faseAbreviatura: 'EJECUCIÓN',
      descripcion: 'x',
      tipoDetalle: 'detallado',
      edtRefId: 'edt-1',
      subItems: [
        {
          numeracion: '11.2.1',
          actividadNombre: 'Tendido',
          descripcion: 'x',
          actividadRefId: 'act-1',
          tareas: [{ tareaRefId: tareaRef, nombre: 'tarea', texto: 'x', catalogoImagenesRechazadas: rechazadas }],
        },
      ],
    },
  ]
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('aplicarSugerenciasImagenesIA', () => {
  it('un catalogoImagenId inexistente/inactivo se descarta y no crea ninguna imagen', async () => {
    mockPlanTrabajoImagenFindMany.mockResolvedValue([]) // sin imágenes existentes para la tarea
    mockCatalogoImagenFindMany.mockResolvedValue([]) // el id no existe (o no está activo) en el catálogo real

    await aplicarSugerenciasImagenesIA(
      'plan-1',
      'user-1',
      [{ edtRef: 'edt-1', tareaRef: 'tarea-1', catalogoImagenIds: ['id-inventado'] }],
      estructuraConRechazos('tarea-1', [])
    )

    expect(mockCatalogoImagenFindMany).toHaveBeenCalledWith({ where: { id: { in: ['id-inventado'] }, activo: true } })
    expect(mockPlanTrabajoImagenCreate).not.toHaveBeenCalled()
  })

  it('una tarea con imagen MANUAL existente no recibe ninguna sugerencia automática', async () => {
    mockPlanTrabajoImagenFindMany.mockResolvedValue([{ id: 'img-manual', origen: 'MANUAL' }])

    await aplicarSugerenciasImagenesIA(
      'plan-1',
      'user-1',
      [{ edtRef: 'edt-1', tareaRef: 'tarea-1', catalogoImagenIds: ['cat-roscadora'] }],
      estructuraConRechazos('tarea-1', [])
    )

    expect(mockPlanTrabajoImagenDeleteMany).not.toHaveBeenCalled()
    expect(mockCatalogoImagenFindMany).not.toHaveBeenCalled()
    expect(mockPlanTrabajoImagenCreate).not.toHaveBeenCalled()
  })

  it('una imagen CONFIRMADA sobrevive a la regeneración — la tarea no se recalcula', async () => {
    mockPlanTrabajoImagenFindMany.mockResolvedValue([{ id: 'img-confirmada', origen: 'CONFIRMADA' }])

    await aplicarSugerenciasImagenesIA(
      'plan-1',
      'user-1',
      [{ edtRef: 'edt-1', tareaRef: 'tarea-1', catalogoImagenIds: ['cat-roscadora'] }],
      estructuraConRechazos('tarea-1', [])
    )

    expect(mockPlanTrabajoImagenDeleteMany).not.toHaveBeenCalled()
    expect(mockPlanTrabajoImagenCreate).not.toHaveBeenCalled()
  })

  it('un catalogoImagenId previamente rechazado por el usuario no se vuelve a proponer', async () => {
    mockPlanTrabajoImagenFindMany.mockResolvedValue([])
    mockCatalogoImagenFindMany.mockResolvedValue([{ id: 'cat-escalera', nombre: 'Escalera con plataforma', driveFileId: 'drive-escalera' }])

    await aplicarSugerenciasImagenesIA(
      'plan-1',
      'user-1',
      [{ edtRef: 'edt-1', tareaRef: 'tarea-1', catalogoImagenIds: ['cat-roscadora', 'cat-escalera'] }],
      estructuraConRechazos('tarea-1', ['cat-roscadora'])
    )

    // Solo se consulta (y adjunta) la que NO fue rechazada.
    expect(mockCatalogoImagenFindMany).toHaveBeenCalledWith({ where: { id: { in: ['cat-escalera'] }, activo: true } })
    expect(mockPlanTrabajoImagenCreate).toHaveBeenCalledTimes(1)
    expect(mockPlanTrabajoImagenCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ catalogoImagenId: 'cat-escalera', origen: 'IA_AUTO', tareaRef: 'tarea-1' }),
    }))
  })

  it('una tarea sin imágenes previas y sin rechazos crea las imágenes IA_AUTO propuestas', async () => {
    mockPlanTrabajoImagenFindMany.mockResolvedValue([])
    mockCatalogoImagenFindMany.mockResolvedValue([
      { id: 'cat-roscadora', nombre: 'Roscadora', driveFileId: 'drive-1' },
      { id: 'cat-escalera', nombre: 'Escalera', driveFileId: 'drive-2' },
    ])

    await aplicarSugerenciasImagenesIA(
      'plan-1',
      'user-1',
      [{ edtRef: 'edt-1', tareaRef: 'tarea-1', catalogoImagenIds: ['cat-roscadora', 'cat-escalera'] }],
      estructuraConRechazos('tarea-1', [])
    )

    expect(mockPlanTrabajoImagenCreate).toHaveBeenCalledTimes(2)
    expect(mockPlanTrabajoImagenCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ catalogoImagenId: 'cat-roscadora', origen: 'IA_AUTO', orden: 0 }),
    }))
    expect(mockPlanTrabajoImagenCreate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ catalogoImagenId: 'cat-escalera', origen: 'IA_AUTO', orden: 1 }),
    }))
  })

  it('una tarea con IA_AUTO previa (sin confirmar) se recalcula: se borran las anteriores y se crean las nuevas', async () => {
    mockPlanTrabajoImagenFindMany.mockResolvedValue([{ id: 'img-ia-vieja', origen: 'IA_AUTO' }])
    mockCatalogoImagenFindMany.mockResolvedValue([{ id: 'cat-andamio', nombre: 'Andamio 3 cuerpos', driveFileId: 'drive-3' }])

    await aplicarSugerenciasImagenesIA(
      'plan-1',
      'user-1',
      [{ edtRef: 'edt-1', tareaRef: 'tarea-1', catalogoImagenIds: ['cat-andamio'] }],
      estructuraConRechazos('tarea-1', [])
    )

    expect(mockPlanTrabajoImagenDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['img-ia-vieja'] } } })
    expect(mockPlanTrabajoImagenCreate).toHaveBeenCalledTimes(1)
  })

  it('sin sugerencias, no consulta nada', async () => {
    await aplicarSugerenciasImagenesIA('plan-1', 'user-1', [], [])
    expect(mockPlanTrabajoImagenFindMany).not.toHaveBeenCalled()
  })
})
