import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    planTrabajo: { findUnique: jest.fn() },
    planTrabajoGeneracion: { findFirst: jest.fn() },
  },
}))

jest.mock('@/lib/services/googleDrive', () => ({
  getFileContent: jest.fn(),
}))

jest.mock('@/lib/planTrabajo/extraerAlcanceDeDocx', () => ({
  extraerAlcanceDeDocx: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'
import { extraerAlcanceDeDocx } from '@/lib/planTrabajo/extraerAlcanceDeDocx'
import { obtenerAlcanceParaContexto } from '@/lib/planTrabajo/obtenerAlcanceParaContexto'

const mockPlanTrabajoFindUnique = prisma.planTrabajo.findUnique as jest.Mock
const mockGeneracionFindFirst = prisma.planTrabajoGeneracion.findFirst as jest.Mock
const mockGetFileContent = getFileContent as jest.Mock
const mockExtraerAlcanceDeDocx = extraerAlcanceDeDocx as jest.Mock

function edtDePrueba(): PlanAlcanceDetalladoEdt[] {
  return [
    {
      numeracion: '11.1',
      edtNombre: 'Construcción',
      edtCodigo: 'CON',
      faseNombre: 'EJECUCIÓN',
      faseAbreviatura: 'EJEC',
      descripcion: 'Descripción del EDT.',
      tipoDetalle: 'detallado',
      subItems: [
        {
          numeracion: '11.1.1',
          actividadNombre: 'Zona A',
          descripcion: 'Descripción de la actividad.',
          tareas: [
            { nombre: 'tarea-1', texto: 'Armar andamio certificado.' },
            { nombre: 'tarea-2', texto: 'Tarea excluida.', excluida: true },
          ],
        },
      ],
    },
  ]
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('obtenerAlcanceParaContexto', () => {
  it('sin Plan de Trabajo, devuelve string vacío', async () => {
    mockPlanTrabajoFindUnique.mockResolvedValue(null)

    const resultado = await obtenerAlcanceParaContexto('proyecto-1')

    expect(resultado).toBe('')
    expect(mockGeneracionFindFirst).not.toHaveBeenCalled()
  })

  it('con V2 vigente y extracción exitosa, usa el texto del DOCX (precedencia sobre el estructurado)', async () => {
    mockPlanTrabajoFindUnique.mockResolvedValue({ id: 'plan-1', alcanceDetallado: edtDePrueba() })
    mockGeneracionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    mockGetFileContent.mockResolvedValue({ data: Buffer.from('bytes'), mimeType: 'x', fileName: 'x' })
    mockExtraerAlcanceDeDocx.mockReturnValue('Texto revisado de la V2.')

    const resultado = await obtenerAlcanceParaContexto('proyecto-1')

    expect(resultado).toBe('Texto revisado de la V2.')
    expect(mockGetFileContent).toHaveBeenCalledWith('drive-123')
  })

  it('sin V2 vigente, cae al alcanceDetallado estructurado (con descripciones y tareas no excluidas)', async () => {
    mockPlanTrabajoFindUnique.mockResolvedValue({ id: 'plan-1', alcanceDetallado: edtDePrueba() })
    mockGeneracionFindFirst.mockResolvedValue(null)

    const resultado = await obtenerAlcanceParaContexto('proyecto-1')

    expect(resultado).toContain('Descripción del EDT.')
    expect(resultado).toContain('Descripción de la actividad.')
    expect(resultado).toContain('- Armar andamio certificado.')
    expect(resultado).not.toContain('Tarea excluida.')
    expect(mockGetFileContent).not.toHaveBeenCalled()
  })

  it('con V2 vigente pero extracción vacía (docx sin la sección), cae al alcanceDetallado estructurado', async () => {
    mockPlanTrabajoFindUnique.mockResolvedValue({ id: 'plan-1', alcanceDetallado: edtDePrueba() })
    mockGeneracionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    mockGetFileContent.mockResolvedValue({ data: Buffer.from('bytes'), mimeType: 'x', fileName: 'x' })
    mockExtraerAlcanceDeDocx.mockReturnValue('')

    const resultado = await obtenerAlcanceParaContexto('proyecto-1')

    expect(resultado).toContain('Armar andamio certificado.')
  })

  it('si falla la descarga de Drive, no revienta — cae al alcanceDetallado estructurado', async () => {
    mockPlanTrabajoFindUnique.mockResolvedValue({ id: 'plan-1', alcanceDetallado: edtDePrueba() })
    mockGeneracionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    mockGetFileContent.mockRejectedValue(new Error('Drive caído'))

    const resultado = await obtenerAlcanceParaContexto('proyecto-1')

    expect(resultado).toContain('Armar andamio certificado.')
  })

  it('sin alcanceDetallado y sin V2, devuelve string vacío', async () => {
    mockPlanTrabajoFindUnique.mockResolvedValue({ id: 'plan-1', alcanceDetallado: null })
    mockGeneracionFindFirst.mockResolvedValue(null)

    expect(await obtenerAlcanceParaContexto('proyecto-1')).toBe('')
  })
})
