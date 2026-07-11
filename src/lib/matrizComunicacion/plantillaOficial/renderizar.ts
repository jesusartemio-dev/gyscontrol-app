import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { descargarPlantillaMatrizOficial } from './descargarPlantilla'
import { resolverLogoClienteBuffer } from './resolverLogoCliente'
import { prepararXmlPlantilla, codigoTagName } from './prepararXmlDinamico'
import { formatearFirma, inicialesDe } from './formatearFirma'

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

  const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const dataBag: Record<string, unknown> = {
    cliente: datos.proyecto.clienteNombre,
    sede: datos.proyecto.sede ?? '',
    ordenCompra: datos.proyecto.ordenCompraCliente ?? '',
    nombreProyecto: datos.proyecto.nombre,
    etapa: datos.proyecto.etapa ?? '',
    tituloDocumento: TITULO_DOCUMENTO,
    codigoDocumento: datos.matriz.codigoDocumento ?? '',
    numeroConsultor: datos.matriz.numeroConsultor ?? '',
    revision: datos.matriz.revisionDocumento,
    // v1: una sola fila con la revisión actual — no se modela historial de
    // revisiones todavía (decidido explícitamente, ver plan). Las filas
    // vacías fijas de la plantilla (formato del cliente) quedan tal cual,
    // fuera de este loop.
    revisiones: [
      {
        rev: datos.matriz.revisionDocumento,
        te: 'A',
        teDescripcion: 'Para Conocimiento',
        des: inicialesDe(datos.matriz.desarrolloNombre ?? ''),
        ver: inicialesDe(datos.matriz.verificoNombre ?? ''),
        apr: inicialesDe(datos.matriz.aproboNombre ?? ''),
        aut: inicialesDe(datos.matriz.autorizoNombre ?? ''),
        fecha: hoy,
      },
    ],
    firmaDes: formatearFirma(datos.matriz.desarrolloNombre),
    firmaVer: formatearFirma(datos.matriz.verificoNombre),
    firmaApr: formatearFirma(datos.matriz.aproboNombre),
    firmaAut: formatearFirma(datos.matriz.autorizoNombre),
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

  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
}
