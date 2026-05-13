import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { descargarPlantillaPets } from './descargarPlantilla'

interface RenderInput {
  dataBag: Record<string, unknown>
}

export async function renderizarPetsDocx({ dataBag }: RenderInput): Promise<Buffer> {
  const plantillaBuffer = await descargarPlantillaPets()

  const zip = new PizZip(plantillaBuffer)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
    nullGetter: () => '',
  })

  try {
    doc.render(dataBag)
  } catch (e: unknown) {
    const err = e as {
      message?: string
      properties?: { errors?: Array<{ properties?: { id?: string; explanation?: string }; message?: string }> }
    }
    const errores = err.properties?.errors ?? []
    const mensajes = errores
      .map(
        (err2) =>
          `${err2.properties?.id ?? '?'}: ${err2.properties?.explanation ?? err2.message ?? '?'}`
      )
      .join('\n')
    throw new Error(
      `Error al renderizar plantilla PETS: ${err.message ?? String(e)}\n${mensajes}`
    )
  }

  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
}
