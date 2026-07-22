import * as XLSX from 'xlsx'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    mpp: { findUnique: jest.fn() },
    mppVersionArchivo: { findFirst: jest.fn() },
  },
}))

jest.mock('@/lib/services/googleDrive', () => ({
  getFileContent: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'
import { obtenerMppParaContexto } from '@/lib/mpp/obtenerMppParaContexto'

const mockMppFindUnique = prisma.mpp.findUnique as jest.Mock
const mockVersionFindFirst = prisma.mppVersionArchivo.findFirst as jest.Mock
const mockGetFileContent = getFileContent as jest.Mock

function construirXlsxDePrueba(hojas: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new()
  for (const [nombre, filas] of Object.entries(hojas)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), nombre)
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('obtenerMppParaContexto', () => {
  it('sin MPP, devuelve string vacío', async () => {
    mockMppFindUnique.mockResolvedValue(null)

    const resultado = await obtenerMppParaContexto('proyecto-1')

    expect(resultado).toBe('')
    expect(mockVersionFindFirst).not.toHaveBeenCalled()
  })

  it('sin versión V2 vigente, devuelve string vacío (sin bajar nada de Drive)', async () => {
    mockMppFindUnique.mockResolvedValue({ id: 'mpp-1' })
    mockVersionFindFirst.mockResolvedValue(null)

    const resultado = await obtenerMppParaContexto('proyecto-1')

    expect(resultado).toBe('')
    expect(mockGetFileContent).not.toHaveBeenCalled()
  })

  it('con V2 vigente, devuelve el contenido de la hoja "MATRIZ EPPs" como CSV', async () => {
    mockMppFindUnique.mockResolvedValue({ id: 'mpp-1' })
    mockVersionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    const buffer = construirXlsxDePrueba({ 'MATRIZ EPPs': [['EPP', 'Puesto'], ['Arnés', 'Andamiero']] })
    mockGetFileContent.mockResolvedValue({ data: buffer, mimeType: 'x', fileName: 'x' })

    const resultado = await obtenerMppParaContexto('proyecto-1')

    expect(resultado).toContain('Andamiero')
    expect(mockGetFileContent).toHaveBeenCalledWith('drive-123')
  })

  it('si falla la descarga de Drive, no revienta — devuelve string vacío', async () => {
    mockMppFindUnique.mockResolvedValue({ id: 'mpp-1' })
    mockVersionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    mockGetFileContent.mockRejectedValue(new Error('Drive caído'))

    const resultado = await obtenerMppParaContexto('proyecto-1')

    expect(resultado).toBe('')
  })

  it('si el xlsx está corrupto, no revienta — devuelve string vacío', async () => {
    mockMppFindUnique.mockResolvedValue({ id: 'mpp-1' })
    mockVersionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    mockGetFileContent.mockResolvedValue({
      data: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe, 0x00, 0x01, 0x02]),
      mimeType: 'x',
      fileName: 'x',
    })

    const resultado = await obtenerMppParaContexto('proyecto-1')

    expect(resultado).toBe('')
  })
})
