import path from 'path'
import ExcelJS from 'exceljs'
import { descargarBufferDrive } from '@/lib/services/driveImageLoader'
import type { ReporteAvanceAgregado } from '@/lib/services/reporteAvance'
import {
  CELDAS_DATOS,
  CELDAS_REPORTE,
  HITOS,
  RESUMEN_FASES,
  VARIACIONES,
  IMPEDIMENTOS,
  FOTOS_SLOTS,
  type AggView,
} from './mapping'
import { escribirCelda, diasEntre, normalizarFase, extensionDesdeMime } from './helpers'

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'src',
  'lib',
  'services',
  'excelAvanceGenerator',
  'template',
  'reporte-semanal-avance.template.xlsx',
)

const LOTE_FOTOS = 4

/**
 * Genera el Reporte Semanal de Avance (.xlsx) rellenando la plantilla a partir del
 * agregado de datos (Fase 7a). No crea filas: si un bloque tiene más datos que filas
 * disponibles, el exceso se ignora.
 */
export async function generarExcelReporteAvance(agg: ReporteAvanceAgregado): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)

  const wsReporte = wb.getWorksheet('Reporte')
  if (!wsReporte) throw new Error("Plantilla inválida: falta la hoja 'Reporte'")
  const wsDatos = wb.getWorksheet('Datos')

  // El mapping consume una vista compatible (AggView) del agregado.
  const view: AggView = agg

  // ── b) Escalares ─────────────────────────────────────────────────────────
  if (wsDatos) {
    for (const [ref, fn] of Object.entries(CELDAS_DATOS)) {
      escribirCelda(wsDatos, ref, fn(view))
    }
  }
  for (const [ref, fn] of Object.entries(CELDAS_REPORTE)) {
    escribirCelda(wsReporte, ref, fn(view))
  }

  // ── c) HITOS ─────────────────────────────────────────────────────────────
  const hc = HITOS.columnas
  const escribirHito = (h: ReporteAvanceAgregado['hitos'][number], fila: number) => {
    escribirCelda(wsReporte, `${hc.nombre}${fila}`, h.nombre)
    escribirCelda(wsReporte, `${hc.plan}${fila}`, h.fechaPlan)
    escribirCelda(wsReporte, `${hc.pronostico}${fila}`, h.fechaPronostico)
    escribirCelda(wsReporte, `${hc.real}${fila}`, h.fechaReal)
    const base = h.fechaReal ?? h.fechaPronostico
    const variacion = base && h.fechaPlan ? diasEntre(base, h.fechaPlan) : undefined
    escribirCelda(wsReporte, `${hc.variacion}${fila}`, variacion)
    escribirCelda(wsReporte, `${hc.comentario}${fila}`, h.comentario)
  }
  const contractuales = agg.hitos.filter((h) => h.tipo === 'contractual')
  const intermedios = agg.hitos.filter((h) => h.tipo === 'intermedio')
  contractuales
    .slice(0, HITOS.filasContractuales.length)
    .forEach((h, i) => escribirHito(h, HITOS.filasContractuales[i]))
  intermedios
    .slice(0, HITOS.filasIntermedios.length)
    .forEach((h, i) => escribirHito(h, HITOS.filasIntermedios[i]))

  // ── d) RESUMEN (FASE 1: solo % Avance Real Acumulado = fracción) ──────────
  const filasResumen = RESUMEN_FASES.filasPorFase as Record<string, number>
  for (const f of agg.avancePorFase) {
    const fila = filasResumen[normalizarFase(f.nombre)]
    if (!fila) continue
    escribirCelda(wsReporte, `${RESUMEN_FASES.columnas.realAcumulado}${fila}`, f.porcentajeAvance / 100)
  }

  // ── e) VARIACIONES (FASE 1: solo causa de texto) ─────────────────────────
  const filasVariaciones = VARIACIONES.filasPorFase as Record<string, number>
  for (const v of agg.variaciones) {
    const fila = filasVariaciones[normalizarFase(v.fase)]
    if (!fila) continue
    escribirCelda(wsReporte, `${VARIACIONES.columnas.causa}${fila}`, v.causa)
  }

  // ── f) IMPEDIMENTOS (8 filas máx) ────────────────────────────────────────
  agg.impedimentos.slice(0, IMPEDIMENTOS.filas.length).forEach((imp, i) => {
    const fila = IMPEDIMENTOS.filas[i]
    escribirCelda(wsReporte, `${IMPEDIMENTOS.columnas.restriccion}${fila}`, imp.restriccion)
    if (imp.responsable) {
      escribirCelda(wsReporte, `${IMPEDIMENTOS.columnas.responsable}${fila}`, imp.responsable)
    }
    if (imp.fechaLimite) {
      const d = new Date(imp.fechaLimite)
      if (!Number.isNaN(d.getTime())) {
        escribirCelda(wsReporte, `${IMPEDIMENTOS.columnas.fechaLimite}${fila}`, d)
      }
    }
  })

  // ── g) FOTOS (máx 8; descarga en lotes; una foto que falle no aborta) ─────
  const fotosUsar = agg.fotos.slice(0, FOTOS_SLOTS.length)
  for (let i = 0; i < fotosUsar.length; i += LOTE_FOTOS) {
    const lote = fotosUsar.slice(i, i + LOTE_FOTOS)
    const resultados = await Promise.all(
      lote.map(async (foto) => {
        try {
          return { foto, res: await descargarBufferDrive(foto.driveFileId) }
        } catch {
          return { foto, res: null }
        }
      }),
    )
    resultados.forEach(({ foto, res }, j) => {
      const slot = FOTOS_SLOTS[i + j]
      if (!slot || !res) return // descarga nula → slot vacío
      try {
        const imageId = wb.addImage({
          // cast: exceljs trae su propio tipo Buffer (en su @types/node anidado),
          // distinto al Buffer del root que devuelve descargarBufferDrive.
          buffer: res.buffer,
          extension: extensionDesdeMime(res.mimeType),
        } as unknown as Parameters<typeof wb.addImage>[0])
        wsReporte.addImage(imageId, slot.anchorImagen)
        escribirCelda(wsReporte, slot.leyendaCelda, foto.leyenda ?? foto.registroDescripcion ?? '')
      } catch (err) {
        console.warn('[excelAvanceGenerator] foto falló, se omite:', err)
      }
    })
  }

  // ── h) Recalcular al abrir ───────────────────────────────────────────────
  ;(wb as unknown as { calcProperties: { fullCalcOnLoad: boolean } }).calcProperties = {
    fullCalcOnLoad: true,
  }

  // ── i) Serializar ────────────────────────────────────────────────────────
  const buff = await wb.xlsx.writeBuffer()
  return Buffer.isBuffer(buff) ? buff : Buffer.from(buff as ArrayBuffer)
}
