import * as XLSX from 'xlsx'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    iperc: { findUnique: jest.fn() },
    ipercVersionArchivo: { findFirst: jest.fn() },
  },
}))

jest.mock('@/lib/services/googleDrive', () => ({
  getFileContent: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'
import { obtenerIpercParaContexto } from '@/lib/iperc/obtenerIpercParaContexto'

const mockIpercFindUnique = prisma.iperc.findUnique as jest.Mock
const mockVersionFindFirst = prisma.ipercVersionArchivo.findFirst as jest.Mock
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

describe('obtenerIpercParaContexto', () => {
  it('sin IPERC, devuelve string vacío', async () => {
    mockIpercFindUnique.mockResolvedValue(null)

    const resultado = await obtenerIpercParaContexto('proyecto-1')

    expect(resultado).toBe('')
    expect(mockVersionFindFirst).not.toHaveBeenCalled()
  })

  it('sin versión V2 vigente, devuelve string vacío (sin bajar nada de Drive)', async () => {
    mockIpercFindUnique.mockResolvedValue({ id: 'iperc-1' })
    mockVersionFindFirst.mockResolvedValue(null)

    const resultado = await obtenerIpercParaContexto('proyecto-1')

    expect(resultado).toBe('')
    expect(mockGetFileContent).not.toHaveBeenCalled()
  })

  it('con V2 vigente, devuelve el contenido de la hoja "IPERC" como CSV', async () => {
    mockIpercFindUnique.mockResolvedValue({ id: 'iperc-1' })
    mockVersionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    const buffer = construirXlsxDePrueba({ IPERC: [['#', 'Peligro'], [1, 'Caída de altura']] })
    mockGetFileContent.mockResolvedValue({ data: buffer, mimeType: 'x', fileName: 'x' })

    const resultado = await obtenerIpercParaContexto('proyecto-1')

    expect(resultado).toContain('Caída de altura')
    expect(mockGetFileContent).toHaveBeenCalledWith('drive-123')
  })

  it('prioriza la hoja "IPERC" sobre otras hojas del libro', async () => {
    mockIpercFindUnique.mockResolvedValue({ id: 'iperc-1' })
    mockVersionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    const buffer = construirXlsxDePrueba({
      Matriz: [['no debería aparecer']],
      IPERC: [['sí debería aparecer']],
    })
    mockGetFileContent.mockResolvedValue({ data: buffer, mimeType: 'x', fileName: 'x' })

    const resultado = await obtenerIpercParaContexto('proyecto-1')

    expect(resultado).toContain('sí debería aparecer')
    expect(resultado).not.toContain('no debería aparecer')
  })

  it('si falla la descarga de Drive, no revienta — devuelve string vacío', async () => {
    mockIpercFindUnique.mockResolvedValue({ id: 'iperc-1' })
    mockVersionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    mockGetFileContent.mockRejectedValue(new Error('Drive caído'))

    const resultado = await obtenerIpercParaContexto('proyecto-1')

    expect(resultado).toBe('')
  })

  it('si el xlsx está corrupto, no revienta — devuelve string vacío', async () => {
    mockIpercFindUnique.mockResolvedValue({ id: 'iperc-1' })
    mockVersionFindFirst.mockResolvedValue({ driveFileId: 'drive-123' })
    mockGetFileContent.mockResolvedValue({
      data: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe, 0x00, 0x01, 0x02]),
      mimeType: 'x',
      fileName: 'x',
    })

    const resultado = await obtenerIpercParaContexto('proyecto-1')

    expect(resultado).toBe('')
  })
})
