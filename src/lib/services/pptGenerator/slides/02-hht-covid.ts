import type PptxGenJS from 'pptxgenjs'
import { COLORS, FONTS, HHT_COVID } from '../theme'
import { addFooter, addHeaderBanner, DIAS_SEMANA_ABREV, formatearFechaCorta } from '../helpers'
import type { PptGenInput } from '../types'

export function generarSlideHhtCovid(
  pres: PptxGenJS,
  input: PptGenInput,
  pageNumber: number,
  totalPages: number,
): number {
  const slide = pres.addSlide()
  const { agregado } = input

  // Banda superior (sin título — slide 2 tiene título en cuerpo, pero usamos header banner para coherencia)
  addHeaderBanner(pres, slide, 'HHT y Reporte Covid 19 de la Semana')

  // Título HHT
  const tituloHht = `HHT durante la semana – ${formatearFechaCorta(agregado.reporte.fechaInicio)} al ${formatearFechaCorta(agregado.reporte.fechaFin)}`
  slide.addText(tituloHht, {
    ...HHT_COVID.TITULO_HHT,
    y: 1.05,
    fontFace: FONTS.SECTION,
    fontSize: 16,
    bold: true,
    color: COLORS.ORANGE_PRIMARY,
  })

  // ─── Tabla HHT ─────────────────────────────────────────────────────────────
  // Compute HHT per day from jornadas
  const horasPorJornada = (j: typeof agregado.jornadas[number]): number => {
    let totalHoras = 0
    for (const t of j.tareas) {
      for (const m of t.miembros) {
        totalHoras += m.horas ?? 0
      }
    }
    return totalHoras
  }

  const personasPorJornada = (j: typeof agregado.jornadas[number]): number => {
    const ids = new Set<string>()
    ids.add(j.supervisorId)
    for (const t of j.tareas) for (const m of t.miembros) ids.add(m.usuarioId)
    return ids.size
  }

  const filasHht: { dia: string; fecha: string; trabajadores: number; hht: number }[] = []
  let acumulado = 0
  let totalHht = 0
  let totalTrabajadores = 0

  for (const j of agregado.jornadas) {
    const fecha = new Date(j.fechaTrabajo)
    const dia = DIAS_SEMANA_ABREV[fecha.getUTCDay()]
    const hht = horasPorJornada(j)
    const trabajadores = personasPorJornada(j)
    acumulado += hht
    totalHht += hht
    totalTrabajadores = Math.max(totalTrabajadores, trabajadores)
    filasHht.push({
      dia,
      fecha: formatearFechaCorta(fecha),
      trabajadores,
      hht,
    })
  }

  const headerStyle = {
    fontFace: FONTS.SECTION,
    fontSize: 11,
    bold: true,
    color: COLORS.WHITE,
    fill: { color: COLORS.ORANGE_PRIMARY },
    align: 'center' as const,
    valign: 'middle' as const,
  }
  const cellStyle = {
    fontFace: FONTS.SECTION,
    fontSize: 11,
    color: COLORS.GRAY_DARK,
    align: 'center' as const,
    valign: 'middle' as const,
  }

  const headerRow = ['Día', 'Fecha', 'Trabajadores', 'HHT día', 'Acumulado'].map((t) => ({
    text: t,
    options: headerStyle,
  }))

  let acc = 0
  const dataRows = filasHht.map((f) => {
    acc += f.hht
    return [
      { text: f.dia, options: cellStyle },
      { text: f.fecha, options: cellStyle },
      { text: String(f.trabajadores), options: cellStyle },
      { text: f.hht.toFixed(1), options: cellStyle },
      { text: acc.toFixed(1), options: cellStyle },
    ]
  })

  const totalRow = [
    { text: 'TOTAL', options: { ...cellStyle, bold: true, fill: { color: COLORS.GRAY_LIGHT } } },
    { text: '', options: { ...cellStyle, fill: { color: COLORS.GRAY_LIGHT } } },
    { text: String(totalTrabajadores), options: { ...cellStyle, bold: true, fill: { color: COLORS.GRAY_LIGHT } } },
    { text: totalHht.toFixed(1), options: { ...cellStyle, bold: true, fill: { color: COLORS.GRAY_LIGHT } } },
    { text: acumulado.toFixed(1), options: { ...cellStyle, bold: true, fill: { color: COLORS.GRAY_LIGHT } } },
  ]

  if (filasHht.length === 0) {
    slide.addText('Sin jornadas registradas en esta semana.', {
      ...HHT_COVID.TABLA_HHT,
      y: 1.6,
      fontFace: FONTS.SECTION,
      fontSize: 12,
      color: COLORS.FOOTER_GRAY,
      align: 'center',
      italic: true,
    })
  } else {
    slide.addTable([headerRow, ...dataRows, totalRow], {
      ...HHT_COVID.TABLA_HHT,
      y: 1.45,
      h: 2.5,
      border: { type: 'solid', color: COLORS.GRAY_LIGHT, pt: 0.5 },
      colW: [1.3, 2.0, 3.0, 3.0, 3.015],
    })
  }

  // ─── Tabla COVID (omitir si todos los campos son null) ─────────────────────
  const r = agregado.reporte
  const covidFields = [
    r.totalPersonas,
    r.trabajadoresObra,
    r.homeOffice,
    r.casosSospechosos,
    r.casosInfectados,
    r.casosCurados,
    r.fallecidos,
    r.grupoRiesgo,
  ]
  const algunoCovid = covidFields.some((v) => v != null)

  if (algunoCovid) {
    slide.addText('Reporte Covid 19', {
      ...HHT_COVID.TITULO_COVID,
      fontFace: FONTS.SECTION,
      fontSize: 16,
      bold: true,
      color: COLORS.ORANGE_PRIMARY,
    })

    const headerCovid = ['Total Personal', 'Trabajan en obra', 'Home Office', 'Sospechosos', 'Infectados', 'Curados', 'Fallecidos', 'Grupo Riesgo'].map(
      (t) => ({ text: t, options: headerStyle }),
    )

    const dataCovid = covidFields.map((v) => ({
      text: v != null ? String(v) : '—',
      options: cellStyle,
    }))

    slide.addTable([headerCovid, dataCovid], {
      ...HHT_COVID.TABLA_COVID,
      border: { type: 'solid', color: COLORS.GRAY_LIGHT, pt: 0.5 },
    })
  }

  addFooter(slide, pageNumber, totalPages, agregado.reporte.proyecto.nombre)
  return 1
}
