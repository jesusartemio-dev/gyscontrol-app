import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import ImageModule from 'docxtemplater-image-module-free'
import { descargarPlantillaPlanTrabajo } from './descargarPlantilla'
import { sincronizarTblGridDelDocumento } from './postProcesarTblGrid'

interface RenderInput {
  dataBag: Record<string, unknown>
}

/** Imagen ya resuelta (base64 + dimensiones reales) — ver construirDataBag.ts (Bloque 4, Tarea 4). */
export interface ImagenResueltaTag {
  data: string
  width: number
  height: number
}

const ANCHO_MAXIMO_PX = 566 // ~15cm a 96dpi (Tarea 4 — imágenes de alcance detallado)
const ANCHO_ORGANIGRAMA_PX = 600
const ALTO_ORGANIGRAMA_PX = 400

// docxtemplater-image-module-free tiene 2 bugs conocidos:
// 1) render() síncrono no soporta objetos {data,width,height} como valor de {%img}
// 2) resolve() con valores falsy (''/null) devuelve objeto plano en vez de Promise
// → SIEMPRE usar renderAsync() y NUNCA pasar ''/null a un tag de imagen (usar IMAGEN_PLACEHOLDER)
// Versión pineada exacta en package.json (sin ^/~) — un patch upstream podría
// cambiar este comportamiento y romper el export silenciosamente.
export const IMAGEN_PLACEHOLDER: ImagenResueltaTag = {
  data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=',
  width: 0,
  height: 0,
}

function esImagenResuelta(v: unknown): v is ImagenResueltaTag {
  return typeof v === 'object' && v !== null && 'data' in v && typeof (v as { data: unknown }).data === 'string'
}

export async function renderizarPlanTrabajoDocx({ dataBag }: RenderInput): Promise<Buffer> {
  const plantillaBuffer = await descargarPlantillaPlanTrabajo()

  // 1×1 transparent PNG — placeholder cuando no hay imagen (organigrama u otra)
  const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=',
    'base64'
  )

  const imageOpts = {
    centered: true,
    fileType: 'docx' as const,
    getImage: (tagValue: unknown) => {
      if (Buffer.isBuffer(tagValue)) {
        return tagValue.length > 0 ? tagValue : PNG_1X1
      }
      if (esImagenResuelta(tagValue)) {
        if (!tagValue.data) return PNG_1X1
        return Buffer.from(tagValue.data.replace(/^data:image\/[^;]+;base64,/, ''), 'base64')
      }
      if (typeof tagValue === 'string') {
        if (!tagValue) return PNG_1X1
        return Buffer.from(tagValue.replace(/^data:image\/[^;]+;base64,/, ''), 'base64')
      }
      return PNG_1X1
    },
    getSize: (_img: Buffer, tagValue: unknown): [number, number] => {
      // {%img} de alcanceDetallado (Tarea 4) — límite ~15cm de ancho, aspecto real preservado.
      if (esImagenResuelta(tagValue)) {
        if (!tagValue.data || !tagValue.width || !tagValue.height) return [1, 1]
        const ancho = Math.min(tagValue.width, ANCHO_MAXIMO_PX)
        const alto = Math.round(ancho * (tagValue.height / tagValue.width))
        return [ancho, alto]
      }
      // {%organigramaPng} — tamaño fijo histórico, sin datos de aspecto disponibles.
      const isEmpty = !tagValue || (typeof tagValue === 'string' && !tagValue)
      return isEmpty ? [1, 1] : [ANCHO_ORGANIGRAMA_PX, ALTO_ORGANIGRAMA_PX]
    },
  }

  const zip = new PizZip(plantillaBuffer)

  // En dev, una clave faltante en el dataBag debe romper el render (detectarla temprano).
  // En prod, preferimos un documento con un campo vacío antes que una exportación caída.
  const nullGetter = (part: { module?: string; value?: string }): string => {
    const clave = part.value ?? '?'
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`[plan-trabajo] Clave faltante en el dataBag de exportación: "${clave}"`)
    }
    console.error(`[plan-trabajo] Clave faltante en el dataBag de exportación: "${clave}" — se reemplaza por texto vacío`)
    return ''
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter,
    modules: [new ImageModule(imageOpts)],
  })

  try {
    // docxtemplater-image-module-free tiene 2 bugs conocidos:
    // 1) render() síncrono no soporta objetos {data,width,height} como valor de {%img}
    // 2) resolve() con valores falsy (''/null) devuelve objeto plano en vez de Promise
    // → SIEMPRE usar renderAsync() y NUNCA pasar ''/null a un tag de imagen (usar IMAGEN_PLACEHOLDER)
    await doc.renderAsync(dataBag)
  } catch (e: unknown) {
    const err = e as { message?: string; properties?: { errors?: Array<{ properties?: { id?: string; explanation?: string }; message?: string }> } }
    const errores = err.properties?.errors ?? []
    const mensajes = errores
      .map(err2 => `${err2.properties?.id ?? '?'}: ${err2.properties?.explanation ?? err2.message ?? '?'}`)
      .join('\n')
    throw new Error(`Error al renderizar plantilla DOCX: ${err.message ?? String(e)}\n${mensajes}`)
  }

  // Post-proceso: docxtemplater no actualiza <w:tblGrid> cuando un loop
  // {-w:tc} (grilla RACI) duplica celdas — ver postProcesarTblGrid.ts.
  const zipRenderizado = doc.getZip()
  const documentXml = zipRenderizado.file('word/document.xml')!.asText()
  const { xml: documentXmlCorregido, tablasCorregidas } = sincronizarTblGridDelDocumento(documentXml)
  if (tablasCorregidas.length > 0) {
    console.log(`[plan-trabajo] tblGrid corregido post-render en ${tablasCorregidas.length} tabla(s) (índices: ${tablasCorregidas.join(', ')})`)
  }
  zipRenderizado.file('word/document.xml', documentXmlCorregido)

  return zipRenderizado.generate({ type: 'nodebuffer' }) as Buffer
}
