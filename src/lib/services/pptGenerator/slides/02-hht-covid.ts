import type PptxGenJS from 'pptxgenjs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { COLORS, FONTS, HHT_COVID } from '../theme'
import { addFooter, addHeaderBanner } from '../helpers'
import type { PptGenInput } from '../types'

const DIAS_SEMANA_COMPLETO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function formatRangoFecha(inicio: Date | string, fin: Date | string): string {
  const i = typeof inicio === 'string' ? new Date(inicio) : inicio
  const f = typeof fin === 'string' ? new Date(fin) : fin
  const diaInicio = i.getUTCDate()
  const diaFin = f.getUTCDate()
  const mes = format(f, 'MMMM', { locale: es })
  const mesCapitalized = mes.charAt(0).toUpperCase() + mes.slice(1)
  return `"del ${diaInicio} al ${diaFin} de ${mesCapitalized}"`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function generarSlideHhtCovid(
  pres: PptxGenJS,
  input: PptGenInput,
  pageNumber: number,
  totalPages: number,
): number {
  const slide = pres.addSlide()
  const { agregado } = input

  addHeaderBanner(pres, slide, 'HHT y Reporte Covid 19 de la Semana')

  // ─── Título HHT ────────────────────────────────────────────────────────────
  const tituloHht = `HHT durante la semana – ${formatRangoFecha(agregado.reporte.fechaInicio, agregado.reporte.fechaFin).replace(/"/g, '')}`
  slide.addText(tituloHht, {
    ...HHT_COVID.TITULO_HHT,
    y: 1.05,
    fontFace: FONTS.SECTION,
    fontSize: 16,
    bold: true,
    color: COLORS.ORANGE_PRIMARY,
  })

  // ─── Cálculos HHT ──────────────────────────────────────────────────────────
  const uniqueWorkerIds = new Set<string>()
  let totalHHT = 0

  for (const j of agregado.jornadas) {
    uniqueWorkerIds.add(j.supervisorId)
    for (const t of j.tareas) {
      for (const m of t.miembros) {
        uniqueWorkerIds.add(m.usuarioId)
        totalHHT += m.horas ?? 0
      }
    }
  }

  const nTrabajadores = uniqueWorkerIds.size
  const nDias = agregado.jornadas.length
  const horasPorDia = nTrabajadores > 0 && nDias > 0
    ? Math.round(totalHHT / (nTrabajadores * nDias))
    : 0

  const nombreProyecto = agregado.reporte.proyecto.descripcion ?? agregado.reporte.proyecto.nombre
  const rango = formatRangoFecha(agregado.reporte.fechaInicio, agregado.reporte.fechaFin)

  // ─── Actividades: una línea por jornada con día en negrita + subrayado ──────
  type TextRun = { text: string; options?: PptxGenJS.TextPropsOptions }
  const actividadesRuns: TextRun[] = []

  for (const j of agregado.jornadas) {
    const fecha = new Date(j.fechaTrabajo)
    const diaNombre = DIAS_SEMANA_COMPLETO[fecha.getUTCDay()]
    const tareasTexto = j.tareas.length > 0
      ? j.tareas.map((t) => t.proyectoTarea?.nombre ?? t.nombreTareaExtra ?? 'Actividad').join(', ')
      : 'Sin tareas registradas'

    actividadesRuns.push({ text: `${diaNombre}: `, options: { bold: true, underline: { style: 'sng' } } })
    actividadesRuns.push({ text: `${tareasTexto}.\n`, options: {} })
  }

  // Quitar último salto de línea
  if (actividadesRuns.length > 0) {
    const last = actividadesRuns[actividadesRuns.length - 1]
    if (last.text.endsWith('\n')) last.text = last.text.slice(0, -1)
  }

  // ─── Estilos ───────────────────────────────────────────────────────────────
  const headerStyle = {
    fontFace: FONTS.SECTION,
    fontSize: 9,
    bold: true,
    color: COLORS.WHITE,
    fill: { color: COLORS.ORANGE_PRIMARY },
    align: 'center' as const,
    valign: 'middle' as const,
  }
  const cellCenter = {
    fontFace: FONTS.SECTION,
    fontSize: 10,
    color: COLORS.GRAY_DARK,
    fill: { color: 'FFD9C0' },
    align: 'center' as const,
    valign: 'middle' as const,
  }
  const cellLeft = {
    fontFace: FONTS.SECTION,
    fontSize: 10,
    color: COLORS.GRAY_DARK,
    fill: { color: 'FFD9C0' },
    align: 'left' as const,
    valign: 'top' as const,
  }
  const cellTotal = {
    fontFace: FONTS.SECTION,
    fontSize: 10,
    bold: true,
    color: COLORS.GRAY_DARK,
    fill: { color: 'FBBFA0' },
    align: 'center' as const,
    valign: 'middle' as const,
  }

  // Columnas: PROYECTO | ACTIVIDADES | FECHA | N°TRAB | N°DIAS | H/DIA | HHT
  // Suma = 12.315"
  const colW = [1.8, 4.815, 1.5, 0.85, 0.85, 1.15, 1.35]

  const headerRow = [
    'PROYECTO',
    'ACTIVIDADES',
    'FECHA',
    'N° TRABAJADORES',
    'N° DE DÍAS\nTRABAJADOS',
    'N° DE HORAS\nTRABAJADAS\nPOR DÍA',
    'HORAS HOMBRES\nTRABAJADAS',
  ].map((t) => ({ text: t, options: headerStyle }))

  if (agregado.jornadas.length === 0) {
    const sinDatos = { text: '—', options: cellCenter }
    slide.addTable(
      [
        headerRow,
        [
          { text: `"${nombreProyecto}"`, options: { ...cellCenter, bold: true } },
          { text: 'Sin jornadas registradas en esta semana.', options: { ...cellLeft, italic: true } },
          sinDatos, sinDatos, sinDatos, sinDatos, sinDatos,
        ],
      ],
      { ...HHT_COVID.TABLA_HHT, y: 1.45, h: 1.5, colW, border: { type: 'solid', color: COLORS.GRAY_LIGHT, pt: 0.5 } },
    )
  } else {
    const dataRow = [
      {
        text: `"${nombreProyecto}"`,
        options: { ...cellCenter, bold: true, fontSize: 9 },
      },
      {
        text: actividadesRuns.length > 0 ? actividadesRuns : '—',
        options: { ...cellLeft, fontSize: 9, bullet: { type: 'bullet' as const } },
      },
      {
        text: rango,
        options: { ...cellCenter, italic: true, fontSize: 9 },
      },
      { text: pad2(nTrabajadores), options: cellCenter },
      { text: pad2(nDias),         options: cellCenter },
      { text: pad2(horasPorDia),   options: cellCenter },
      { text: String(Math.round(totalHHT)), options: cellCenter },
    ]

    const totalRow = [
      { text: '', options: { ...cellTotal, fill: { color: 'FBBFA0' } } },
      { text: '', options: { ...cellTotal, fill: { color: 'FBBFA0' } } },
      { text: '', options: { ...cellTotal, fill: { color: 'FBBFA0' } } },
      { text: '', options: { ...cellTotal, fill: { color: 'FBBFA0' } } },
      { text: '', options: { ...cellTotal, fill: { color: 'FBBFA0' } } },
      { text: 'TOTAL', options: cellTotal },
      { text: String(Math.round(totalHHT)), options: cellTotal },
    ]

    slide.addTable([headerRow, dataRow, totalRow], {
      ...HHT_COVID.TABLA_HHT,
      y: 1.45,
      h: 2.5,
      colW,
      border: { type: 'solid', color: COLORS.GRAY_LIGHT, pt: 0.5 },
    })
  }

  // ─── Tabla COVID ───────────────────────────────────────────────────────────
  // Posiciones COVID ajustadas para no solapar la tabla HHT (que termina en y=3.95)
  const COVID_TITULO_Y = 4.05
  const COVID_TABLA_Y = 4.55

  const r = agregado.reporte
  const covidCampos = [
    r.totalPersonas,
    r.trabajadoresObra,
    r.homeOffice,
    r.casosSospechosos,
    r.casosInfectados,
    r.casosCurados,
    r.fallecidos,
    r.grupoRiesgo,
  ]
  const algunoCovid = covidCampos.some((v) => v != null)

  if (algunoCovid) {
    slide.addText('Reporte Covid 19', {
      ...HHT_COVID.TITULO_COVID,
      y: COVID_TITULO_Y,
      fontFace: FONTS.SECTION,
      fontSize: 16,
      bold: true,
      color: COLORS.ORANGE_PRIMARY,
    })

    const hdrCovid = [
      'PROYECTO',
      'TOTAL DE\nPERSONAS',
      'CANTIDAD DE\nTRABAJADORES\nEN OBRA',
      'NÚMERO DE\nEMPLEADOS EN\nHOME OFFICE',
      'CASOS\nSOSPECHOSOS',
      'CASOS\nINFECTADOS',
      'CASOS\nCURADOS',
      'FALLECIDOS',
      'PERSONAS EN\nGRUPO DE\nRIESGO',
    ].map((t) => ({ text: t, options: { ...headerStyle, fontSize: 8 } }))

    const formatCovid = (v: number | null, conSemana = false): string => {
      const num = pad2(v ?? 0)
      return conSemana ? `${num} (En la semana)` : num
    }

    const dataCovid = [
      { text: `"${nombreProyecto}"`, options: { ...cellCenter, bold: true, fontSize: 8 } },
      { text: formatCovid(r.totalPersonas),       options: { ...cellCenter, fontSize: 9 } },
      { text: formatCovid(r.trabajadoresObra),     options: { ...cellCenter, fontSize: 9 } },
      { text: formatCovid(r.homeOffice),           options: { ...cellCenter, fontSize: 9 } },
      { text: formatCovid(r.casosSospechosos, true), options: { ...cellCenter, fontSize: 8 } },
      { text: formatCovid(r.casosInfectados, true),  options: { ...cellCenter, fontSize: 8 } },
      { text: formatCovid(r.casosCurados),         options: { ...cellCenter, fontSize: 9 } },
      { text: formatCovid(r.fallecidos),           options: { ...cellCenter, fontSize: 9 } },
      { text: formatCovid(r.grupoRiesgo),          options: { ...cellCenter, fontSize: 9 } },
    ]

    // 9 columnas: 1.2 + 1.15×8 = 1.2 + 9.2 = 10.4... ajustemos:
    // Total = 12.315: 1.8 + 1.5 + 1.5 + 1.3 + 1.3 + 1.1 + 1.0 + 0.965 + 0.85 = 12.315
    const covidColW = [1.8, 1.5, 1.5, 1.3, 1.3, 1.1, 1.0, 0.965, 0.85]

    slide.addTable([hdrCovid, dataCovid], {
      ...HHT_COVID.TABLA_COVID,
      y: COVID_TABLA_Y,
      colW: covidColW,
      border: { type: 'solid', color: COLORS.GRAY_LIGHT, pt: 0.5 },
    })
  }

  addFooter(slide, pageNumber, totalPages, agregado.reporte.proyecto.nombre)
  return 1
}
