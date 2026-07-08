import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import ImageModule from 'docxtemplater-image-module-free'
import { descargarPlantillaPlanTrabajo } from './descargarPlantilla'

interface RenderInput {
  dataBag: Record<string, unknown>
}

export async function renderizarPlanTrabajoDocx({ dataBag }: RenderInput): Promise<Buffer> {
  const plantillaBuffer = await descargarPlantillaPlanTrabajo()

  // 1×1 transparent PNG — placeholder cuando no hay organigrama
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
      if (typeof tagValue === 'string') {
        if (!tagValue) return PNG_1X1
        return Buffer.from(tagValue.replace(/^data:image\/[^;]+;base64,/, ''), 'base64')
      }
      return PNG_1X1
    },
    getSize: (_img: Buffer, tagValue: unknown): [number, number] => {
      const isEmpty = !tagValue || (typeof tagValue === 'string' && !tagValue)
      return isEmpty ? [1, 1] : [600, 400]
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
    doc.render(dataBag)
  } catch (e: unknown) {
    const err = e as { message?: string; properties?: { errors?: Array<{ properties?: { id?: string; explanation?: string }; message?: string }> } }
    const errores = err.properties?.errors ?? []
    const mensajes = errores
      .map(err2 => `${err2.properties?.id ?? '?'}: ${err2.properties?.explanation ?? err2.message ?? '?'}`)
      .join('\n')
    throw new Error(`Error al renderizar plantilla DOCX: ${err.message ?? String(e)}\n${mensajes}`)
  }

  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
}
