import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { descargarPlantillaMatrizOficial } from './descargarPlantilla'
import { prepararXmlPlantilla, codigoTagName } from './prepararXmlDinamico'
import { resolverLogoClienteBuffer } from '@/lib/documentosOficiales/plantillaOficial/resolverLogoCliente'
import { reempaquetarZip } from '@/lib/documentosOficiales/plantillaOficial/reempaquetarZip'
import { construirDataBagEncabezado } from '@/lib/documentosOficiales/plantillaOficial/construirDataBagEncabezado'

export interface PersonaMatrizPlantilla {
  siglas: string
  nombre: string
  cargo: string
  empresa: string
  celular: string
  correo: string
}

export interface FilaMatrizPlantilla {
  orden: number
  edtNombre: string
  frecuencia: string
  medio: string
  celdas: { siglas: string; valor: string }[]
}

export interface DatosMatrizPlantilla {
  proyecto: {
    nombre: string
    clienteNombre: string
    clienteLogoUrl: string | null
    sede: string | null
    ordenCompraCliente: string | null
    etapa: string | null
  }
  matriz: {
    codigoDocumento: string | null
    revisionDocumento: string
    numeroConsultor: string | null
    desarrolloNombre: string | null
    verificoNombre: string | null
    aproboNombre: string | null
    autorizoNombre: string | null
  }
  personal: PersonaMatrizPlantilla[]
  filas: FilaMatrizPlantilla[]
}

const TITULO_DOCUMENTO = 'MATRIZ DE COMUNICACIÓN'

/**
 * Render de la Matriz de Comunicaciones con la plantilla oficial de cliente.
 * Cualquier error acá (plantilla ilegible, estructura inesperada, tag
 * faltante en dev) debe dejar que el caller (la ruta docx) capture y caiga al
 * export genérico existente — nunca se maneja el fallback acá adentro.
 */
export async function renderMatrizPlantillaOficial(datos: DatosMatrizPlantilla): Promise<Buffer> {
  const plantillaBuffer = await descargarPlantillaMatrizOficial()
  const zip = new PizZip(plantillaBuffer)

  const documentXmlOriginal = zip.file('word/document.xml')?.asText()
  const header1XmlOriginal = zip.file('word/header1.xml')?.asText()
  if (!documentXmlOriginal || !header1XmlOriginal) {
    throw new Error('[matriz-plantilla] La plantilla no tiene word/document.xml o word/header1.xml — archivo corrupto o formato inesperado.')
  }

  const { documentXml, header1Xml, siglasTags } = prepararXmlPlantilla({
    documentXml: documentXmlOriginal,
    header1Xml: header1XmlOriginal,
    numPersonas: datos.personal.length,
  })
  zip.file('word/document.xml', documentXml)
  zip.file('word/header1.xml', header1Xml)

  const logoBuffer = await resolverLogoClienteBuffer(datos.proyecto.clienteLogoUrl)
  if (logoBuffer) {
    zip.file('word/media/image4.png', logoBuffer)
  }

  const dataBag: Record<string, unknown> = {
    ...construirDataBagEncabezado({
      proyecto: datos.proyecto,
      documento: datos.matriz,
      tituloDocumento: TITULO_DOCUMENTO,
    }),
    contactos: datos.personal,
    filas: datos.filas.map((f, idx) => {
      const codigos: Record<string, string> = {}
      datos.personal.forEach((p, i) => {
        const celda = f.celdas.find(c => c.siglas === p.siglas)
        codigos[codigoTagName(i)] = celda?.valor ?? ''
      })
      return { id: String(idx + 1), actividad: f.edtNombre, frecuencia: f.frecuencia, medio: f.medio, ...codigos }
    }),
  }
  siglasTags.forEach((tag, i) => {
    dataBag[tag] = datos.personal[i]?.siglas ?? ''
  })

  // Mismo criterio que planTrabajo/exportDocx.ts: en dev, una clave faltante
  // debe romper el render (detectarla temprano); en prod, mejor un documento
  // con un campo vacío que una exportación caída.
  const nullGetter = (part: { module?: string; value?: string }): string => {
    const clave = part.value ?? '?'
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`[matriz-plantilla] Clave faltante en el dataBag de exportación: "${clave}"`)
    }
    console.warn(`[matriz-plantilla] Clave faltante en el dataBag de exportación: "${clave}" — se reemplaza por texto vacío`)
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
    throw new Error(`[matriz-plantilla] Error al renderizar la plantilla oficial: ${err.message ?? String(e)}\n${mensajes}`)
  }

  const bufferGenerado = doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
  return reempaquetarZip(bufferGenerado)
}
