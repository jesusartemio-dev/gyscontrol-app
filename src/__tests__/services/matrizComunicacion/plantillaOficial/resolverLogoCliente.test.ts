import sharp from 'sharp'
import { resolverLogoClienteBuffer } from '@/lib/matrizComunicacion/plantillaOficial/resolverLogoCliente'
import { getFileContent } from '@/lib/services/googleDrive'

jest.mock('@/lib/services/googleDrive', () => ({
  getFileContent: jest.fn(),
}))

const getFileContentMock = getFileContent as jest.Mock

describe('resolverLogoClienteBuffer', () => {
  beforeEach(() => {
    getFileContentMock.mockReset()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('sin logoUrl devuelve null y advierte en log', async () => {
    const resultado = await resolverLogoClienteBuffer(null)
    expect(resultado).toBeNull()
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('sin logoUrl'))
    expect(getFileContentMock).not.toHaveBeenCalled()
  })

  it('con logoUrl, descarga y normaliza a 428x104 PNG con fondo transparente', async () => {
    // Imagen de origen de aspecto muy distinto (cuadrada, 200x200) — simula un
    // logo que NO viene en el ratio ~4:1 del marco de la plantilla.
    const origen = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } })
      .png()
      .toBuffer()
    getFileContentMock.mockResolvedValue({ data: origen, mimeType: 'image/png', fileName: 'logo.png' })

    const resultado = await resolverLogoClienteBuffer('fake-drive-file-id')
    expect(resultado).not.toBeNull()
    const metadata = await sharp(resultado!).metadata()
    expect(metadata.width).toBe(428)
    expect(metadata.height).toBe(104)
    expect(metadata.format).toBe('png')
    expect(getFileContentMock).toHaveBeenCalledWith('fake-drive-file-id')
  })

  it('si la descarga/normalización falla, devuelve null y advierte (nunca lanza)', async () => {
    getFileContentMock.mockRejectedValue(new Error('403 sin acceso'))
    const resultado = await resolverLogoClienteBuffer('fake-drive-file-id')
    expect(resultado).toBeNull()
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('No se pudo resolver el logo'), expect.anything())
  })

  it('si la data descargada no es una imagen válida, devuelve null en vez de lanzar', async () => {
    getFileContentMock.mockResolvedValue({ data: Buffer.from('no soy una imagen'), mimeType: 'application/octet-stream', fileName: 'logo.png' })
    const resultado = await resolverLogoClienteBuffer('fake-drive-file-id')
    expect(resultado).toBeNull()
  })
})
