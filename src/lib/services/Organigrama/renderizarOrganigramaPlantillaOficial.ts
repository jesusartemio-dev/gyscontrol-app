import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { descargarPlantillaOrganigramaOficial } from './descargarPlantillaOrganigrama'
import { normalizarImagenOrganigrama } from './normalizarImagenOrganigrama'
import { calcularExtentEmu, ajustarExtentEnDocumentXml } from './ajustarExtentImagenOrganigrama'
import { insertarCamposPaginacion } from '@/lib/documentosOficiales/plantillaOficial/insertarCamposPaginacion'
import { resolverLogoClienteBuffer } from '@/lib/documentosOficiales/plantillaOficial/resolverLogoCliente'
import { reempaquetarZip } from '@/lib/documentosOficiales/plantillaOficial/reempaquetarZip'
import { construirDataBagEncabezado } from '@/lib/documentosOficiales/plantillaOficial/construirDataBagEncabezado'

export interface DatosOrganigramaPlantilla {
  proyecto: {
    nombre: string
    clienteNombre: string
    clienteLogoUrl: string | null
    sede: string | null
    ordenCompraCliente: string | null
    etapa: string | null
  }
  documento: {
    codigoDocumento: string | null
    revisionDocumento: string
    numeroConsultor: string | null
    desarrolloNombre: string | null
    verificoNombre: string | null
    aproboNombre: string | null
    autorizoNombre: string | null
  }
  organigramaImagenBuffer: Buffer
}

const TITULO_DOCUMENTO = 'ORGANIGRAMA DEL PROYECTO'

/**
 * Render del organigrama con la plantilla oficial de cliente. A diferencia de
 * la Matriz, document.xml no tiene tabla dinámica ni loops sin cerrar — el
 * único texto que se toca es el wp:extent/a:ext del drawing de la imagen,
 * ajustado dinámicamente al aspect ratio real del árbol capturado (ver
 * ajustarExtentImagenOrganigrama.ts) para que ocupe la página sin padding.
 * La imagen en sí se inyecta 100% por byte-swap de word/media/organigrama.png
 * (igual que el logo del cliente) — no existe render server-side del árbol,
 * la imagen llega ya generada desde el navegador.
 */
export async function renderOrganigramaPlantillaOficial(datos: DatosOrganigramaPlantilla): Promise<Buffer> {
  const plantillaBuffer = await descargarPlantillaOrganigramaOficial()
  const zip = new PizZip(plantillaBuffer)

  const header1XmlOriginal = zip.file('word/header1.xml')?.asText()
  const documentXmlOriginal = zip.file('word/document.xml')?.asText()
  if (!header1XmlOriginal || !documentXmlOriginal) {
    throw new Error('[organigrama-plantilla] La plantilla no tiene word/header1.xml o word/document.xml — archivo corrupto o formato inesperado.')
  }
  zip.file('word/header1.xml', insertarCamposPaginacion(header1XmlOriginal))

  const logoBuffer = await resolverLogoClienteBuffer(datos.proyecto.clienteLogoUrl)
  if (logoBuffer) {
    zip.file('word/media/image4.png', logoBuffer)
  }

  const imagenNormalizada = await normalizarImagenOrganigrama(datos.organigramaImagenBuffer)
  zip.file('word/media/organigrama.png', imagenNormalizada.buffer)

  const { cx, cy } = calcularExtentEmu(imagenNormalizada.width, imagenNormalizada.height)
  zip.file('word/document.xml', ajustarExtentEnDocumentXml(documentXmlOriginal, cx, cy))

  const dataBag = construirDataBagEncabezado({
    proyecto: datos.proyecto,
    documento: datos.documento,
    tituloDocumento: TITULO_DOCUMENTO,
  })

  // Mismo criterio que renderizar.ts (Matriz): en dev, una clave faltante debe
  // romper el render (detectarla temprano); en prod, mejor un documento con un
  // campo vacío que una exportación caída.
  const nullGetter = (part: { module?: string; value?: string }): string => {
    const clave = part.value ?? '?'
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`[organigrama-plantilla] Clave faltante en el dataBag de exportación: "${clave}"`)
    }
    console.warn(`[organigrama-plantilla] Clave faltante en el dataBag de exportación: "${clave}" — se reemplaza por texto vacío`)
    return ''
  }

  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter })

  try {
    doc.render(dataBag)
  } catch (e: unknown) {
    const err = e as { message?: string; properties?: { errors?: Array<{ properties?: { id?: string; explanation?: string }; message?: string }> } }
    const errores = err.properties?.errors ?? []
    const mensajes = errores
      .map(err2 => `${err2.properties?.id ?? '?'}: ${err2.properties?.explanation ?? err2.message ?? '?'}`)
      .join('\n')
    throw new Error(`[organigrama-plantilla] Error al renderizar la plantilla oficial: ${err.message ?? String(e)}\n${mensajes}`)
  }

  const bufferGenerado = doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
  return reempaquetarZip(bufferGenerado)
}
