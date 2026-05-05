import PptxGenJSCtor from 'pptxgenjs'
import type PptxGenJS from 'pptxgenjs'
import type { ReporteAgregado } from '../reporteSeguridad'
import { descargarImagenesDrive } from '../driveImageLoader'
import type { PptGenInput } from './types'
import { generarSlidePortada } from './slides/01-portada'
import { generarSlideHhtCovid } from './slides/02-hht-covid'
import { generarSlidesCharlas } from './slides/03-charlas'
import { generarSlidesInspecciones } from './slides/04-inspecciones'
import { generarSlideIncidentes } from './slides/05-incidentes'
import { generarSlidesActividades } from './slides/06-actividades'
import { generarSlideRiesgoCritico } from './slides/07-riesgo-critico'
import { generarSlidesMedioAmbiente } from './slides/08-medio-ambiente'
import { generarSlidePrevencion } from './slides/09-prevencion'
import { generarSlideCierre } from './slides/10-cierre'

/**
 * Genera el PPT completo del reporte semanal de seguridad y lo devuelve como Buffer.
 *
 * Las fotos de los registros se descargan en paralelo desde Drive con concurrencia limitada.
 * Si una foto falla, se reemplaza por un placeholder gris.
 *
 * Estimado: ~3s para un reporte con 20 fotos.
 */
export async function generarPptReporteSeguridad(agregado: ReporteAgregado): Promise<Buffer> {
  const t0 = Date.now()
  const proyectoId = agregado.reporte.proyectoId
  const semana = agregado.reporte.semanaIso

  console.info(`[pptGenerator] start proyecto=${proyectoId} semana=${semana} registros=${agregado.registros.length}`)

  // ─── 1. Descargar todas las fotos en paralelo ─────────────────────────────
  const fotosPlanas: { registroId: string; foto: typeof agregado.registros[number]['fotos'][number] }[] = []
  for (const r of agregado.registros) {
    for (const f of r.fotos) fotosPlanas.push({ registroId: r.id, foto: f })
  }

  const driveIds = fotosPlanas.map((p) => p.foto.driveFileId ?? null)
  // Concurrency se lee de DRIVE_DOWNLOAD_CONCURRENCY env var; default 5
  const datosBase64 = await descargarImagenesDrive(driveIds)

  const fallidas = datosBase64.filter((d) => d === null).length
  console.info(`[pptGenerator] photos downloaded ok=${datosBase64.length - fallidas} failed=${fallidas} total=${driveIds.length}`)

  // Reagrupar por registroId conservando el orden original de las fotos
  const fotosPorRegistro = new Map<string, (string | null)[]>()
  for (const r of agregado.registros) fotosPorRegistro.set(r.id, [])
  fotosPlanas.forEach((p, i) => {
    const arr = fotosPorRegistro.get(p.registroId)!
    arr.push(datosBase64[i])
  })

  // ─── 2. Inicializar presentación ──────────────────────────────────────────
  // pptxgenjs CJS export object — call constructor explicitly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pres: PptxGenJS = new (PptxGenJSCtor as unknown as { new (): PptxGenJS })()
  pres.layout = 'LAYOUT_WIDE'
  pres.title = `Reporte Semanal Seguridad ${semana} – ${agregado.reporte.proyecto.nombre}`
  pres.author = 'GyS Control'
  pres.company = 'GyS Control'
  pres.subject = `Reporte semanal de seguridad ${semana}`

  const input: PptGenInput = { agregado, fotosPorRegistro }

  // ─── 3. Generar slides ────────────────────────────────────────────────────
  // Pre-cálculo del total de slides para paginación
  const charlasCount = agregado.registros.filter((r) => r.tipo === 'charla').length
  const inspeccionesCount = agregado.registros.filter((r) => r.tipo === 'inspeccion').length
  const actividadesCount = agregado.registros.filter((r) => r.tipo === 'actividad_general').length
  const medioAmbCount = agregado.registros.filter((r) => r.tipo === 'medio_ambiente').length

  const totalPages =
    1 + // portada
    1 + // hht
    Math.max(1, Math.ceil(charlasCount / 3)) + // charlas
    Math.max(1, Math.ceil(inspeccionesCount / 3)) + // inspecciones
    1 + // incidentes
    Math.max(1, Math.ceil(actividadesCount / 2)) + // actividades
    1 + // riesgo
    Math.max(1, medioAmbCount) + // medio ambiente
    1 + // prevencion
    1 // cierre

  let page = 1
  page += generarSlidePortada(pres, agregado.reporte.fechaInicio, agregado.reporte.fechaFin)
  page += generarSlideHhtCovid(pres, input, page, totalPages)
  page += generarSlidesCharlas(pres, input, page, totalPages)
  page += generarSlidesInspecciones(pres, input, page, totalPages)
  page += generarSlideIncidentes(pres, input, page, totalPages)
  page += generarSlidesActividades(pres, input, page, totalPages)
  page += generarSlideRiesgoCritico(pres, input, page, totalPages)
  page += generarSlidesMedioAmbiente(pres, input, page, totalPages)
  page += generarSlidePrevencion(pres, input, page, totalPages)
  generarSlideCierre(pres)

  // ─── 4. Generar buffer ────────────────────────────────────────────────────
  const arrBuffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer
  const buffer = Buffer.isBuffer(arrBuffer) ? arrBuffer : Buffer.from(arrBuffer as ArrayBufferLike)

  const t1 = Date.now()
  console.info(`[pptGenerator] done in ${t1 - t0}ms — ${totalPages} slides, ${buffer.length} bytes`)
  return buffer
}
