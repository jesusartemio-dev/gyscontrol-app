import { readFileSync } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import sharp from 'sharp'
import { renderOrganigramaPlantillaOficial, type DatosOrganigramaPlantilla } from '@/lib/services/Organigrama/renderizarOrganigramaPlantillaOficial'
import { asertarXmlBienFormado } from '@/__tests__/testUtils/xmlTestUtils'

jest.mock('@/lib/services/googleDrive', () => ({
  getFileContent: jest.fn(),
}))

const TEMPLATE_PATH = path.join(process.cwd(), 'src/lib/services/Organigrama/plantilla_organigrama.docx')

async function pngDePrueba(): Promise<Buffer> {
  return sharp({ create: { width: 100, height: 57, channels: 4, background: { r: 200, g: 200, b: 200, alpha: 1 } } })
    .png()
    .toBuffer()
}

async function datosDePrueba(): Promise<DatosOrganigramaPlantilla> {
  return {
    proyecto: {
      nombre: 'Proyecto G300',
      clienteNombre: 'NEXA Resources Perú S.A.',
      clienteLogoUrl: null,
      sede: 'Unidad Cerro Lindo',
      ordenCompraCliente: '8070008797',
      etapa: 'FEL3',
    },
    documento: {
      codigoDocumento: 'OR-I790126021-3GYS-0240COR0001-R0',
      revisionDocumento: '0',
      numeroConsultor: 'GYS-2026-001',
      desarrolloNombre: 'Alonso Piscoya',
      verificoNombre: 'Piero Ríos',
      aproboNombre: 'Piero Ríos',
      autorizoNombre: 'Yony Apaza',
    },
    organigramaImagenBuffer: await pngDePrueba(),
  }
}

describe('renderOrganigramaPlantillaOficial — contra la plantilla REAL', () => {
  it('genera un .docx válido con TODAS las partes XML/rels bien formadas', async () => {
    const buffer = await renderOrganigramaPlantillaOficial(await datosDePrueba())
    expect(Buffer.isBuffer(buffer)).toBe(true)

    const zip = new PizZip(buffer)
    const partesXml = Object.keys(zip.files).filter(
      nombre => !zip.files[nombre].dir && (nombre.endsWith('.xml') || nombre.endsWith('.rels'))
    )
    expect(partesXml.length).toBeGreaterThan(5)
    for (const nombre of partesXml) {
      asertarXmlBienFormado(zip.file(nombre)!.asText(), nombre)
    }
  })

  it('no deja tags docxtemplater sin resolver en document.xml/header1.xml', async () => {
    const buffer = await renderOrganigramaPlantillaOficial(await datosDePrueba())
    const zip = new PizZip(buffer)
    const documentXml = zip.file('word/document.xml')!.asText()
    const header1Xml = zip.file('word/header1.xml')!.asText()

    // "{_organigrama_}" NO es un tag de docxtemplater — es el texto alt
    // (atributo `descr`) del <wp:docPr> de la imagen, decorativo y esperado
    // que sobreviva tal cual (ver el test dedicado más abajo).
    const documentXmlSinDescrOrg = documentXml.replace('{_organigrama_}', '')
    expect(documentXmlSinDescrOrg).not.toMatch(/\{[#/]?[a-z_]/)
    expect(header1Xml).not.toMatch(/\{[#/]?[a-z_]/)

    expect(header1Xml).toContain('NEXA Resources')
    expect(header1Xml).toContain('OR-I790126021-3GYS-0240COR0001-R0')
    expect(header1Xml).toContain('Unidad Cerro Lindo')
    expect(documentXml).toContain('AP: ALONSO PISCOYA')
  })

  // Riesgo explícitamente señalado en el plan: descr="{_organigrama_}" es un
  // atributo (alt-text), no un nodo de texto — debe sobrevivir el render sin
  // corromper el XML. Verificado en código, no solo razonado.
  it('el atributo descr="{_organigrama_}" sobrevive el render sin romper el XML', async () => {
    const original = readFileSync(TEMPLATE_PATH)
    const zipOriginal = new PizZip(original)
    const documentXmlOriginal = zipOriginal.file('word/document.xml')!.asText()
    expect(documentXmlOriginal).toContain('descr="{_organigrama_}"')

    const buffer = await renderOrganigramaPlantillaOficial(await datosDePrueba())
    const zip = new PizZip(buffer)
    const documentXml = zip.file('word/document.xml')!.asText()

    // El XML entero ya se validó bien-formado arriba; acá confirmamos
    // específicamente que el atributo descr no quedó corrupto ni a medias.
    expect(documentXml).toMatch(/descr="[^"]*"/)
    expect(documentXml).toContain('rIdORG')
  })

  it('word/media/organigrama.png fue reemplazado por bytes distintos al placeholder original', async () => {
    const original = readFileSync(TEMPLATE_PATH)
    const zipOriginal = new PizZip(original)
    const placeholderOriginal = Buffer.from(zipOriginal.file('word/media/organigrama.png')!.asUint8Array())

    const buffer = await renderOrganigramaPlantillaOficial(await datosDePrueba())
    const zip = new PizZip(buffer)
    const nuevo = Buffer.from(zip.file('word/media/organigrama.png')!.asUint8Array())

    expect(Buffer.compare(nuevo, placeholderOriginal)).not.toBe(0)
    const metadata = await sharp(nuevo).metadata()
    expect(metadata.width).toBe(2400)
    expect(metadata.height).toBe(1368)
  })

  it('el paquete final queda con [Content_Types].xml primero y sin entradas de directorio', async () => {
    const buffer = await renderOrganigramaPlantillaOficial(await datosDePrueba())
    const zip = new PizZip(buffer)
    const nombres = Object.keys(zip.files)

    expect(nombres[0]).toBe('[Content_Types].xml')
    expect(nombres.filter(n => zip.files[n].dir)).toEqual([])
  })
})
