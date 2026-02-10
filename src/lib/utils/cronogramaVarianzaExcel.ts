import * as XLSX from 'xlsx'

interface VarianzaEntidad {
  nombre: string
  nivel: 'fase' | 'edt' | 'actividad' | 'tarea'
  faseNombre?: string
  edtNombre?: string
  actividadNombre?: string
  fechaInicioPlan: string | null
  fechaFinPlan: string | null
  fechaInicioReal: string | null
  fechaFinReal: string | null
  deltaIniciosDias: number | null
  deltaFinDias: number | null
  horasPlan: number
  horasReales: number
  deltaHoras: number
  porcentajePlan: number
  porcentajeReal: number
}

interface VarianzaKPIs {
  spiGlobal: number
  porcentajeATiempo: number
  porcentajeRetrasadas: number
  porcentajeAdelantadas: number
  varianzaTotalDias: number
  varianzaTotalHoras: number
  totalEntidades: number
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES')
}

export function exportarVarianzaAExcel(data: {
  kpis: VarianzaKPIs
  varianzas: VarianzaEntidad[]
  nombreProyecto: string
}) {
  const { kpis, varianzas, nombreProyecto } = data
  const wb = XLSX.utils.book_new()

  // --- Sheet 1: Resumen KPIs ---
  const kpiRows = [
    ['Indicador', 'Valor'],
    ['SPI Global', kpis.spiGlobal],
    ['% A Tiempo', kpis.porcentajeATiempo],
    ['% Retrasadas', kpis.porcentajeRetrasadas],
    ['% Adelantadas', kpis.porcentajeAdelantadas],
    ['Varianza Total (días)', kpis.varianzaTotalDias],
    ['Varianza Total (horas)', kpis.varianzaTotalHoras],
    ['Total Entidades', kpis.totalEntidades],
  ]
  const wsKPIs = XLSX.utils.aoa_to_sheet(kpiRows)
  wsKPIs['!cols'] = [{ wch: 25 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsKPIs, 'Resumen KPIs')

  // --- Sheet 2: Varianza por EDT ---
  const edtItems = varianzas.filter((v) => v.nivel === 'edt')
  const edtHeader = [
    'Fase',
    'EDT',
    'Fecha Inicio Plan',
    'Fecha Fin Plan',
    'Fecha Inicio Real',
    'Fecha Fin Real',
    'Delta Inicio (días)',
    'Delta Fin (días)',
    'Horas Plan',
    'Horas Reales',
    'Delta Horas',
    '% Avance',
  ]
  const edtRows = edtItems.map((v) => [
    v.faseNombre ?? '',
    v.nombre,
    formatDate(v.fechaInicioPlan),
    formatDate(v.fechaFinPlan),
    formatDate(v.fechaInicioReal),
    formatDate(v.fechaFinReal),
    v.deltaIniciosDias ?? '',
    v.deltaFinDias ?? '',
    v.horasPlan,
    v.horasReales,
    v.deltaHoras,
    v.porcentajeReal,
  ])
  const wsEdt = XLSX.utils.aoa_to_sheet([edtHeader, ...edtRows])
  wsEdt['!cols'] = edtHeader.map(() => ({ wch: 18 }))
  XLSX.utils.book_append_sheet(wb, wsEdt, 'Varianza por EDT')

  // --- Sheet 3: Varianza por Actividad ---
  const actItems = varianzas.filter((v) => v.nivel === 'actividad')
  const actHeader = [
    'Fase',
    'EDT',
    'Actividad',
    'Fecha Inicio Plan',
    'Fecha Fin Plan',
    'Fecha Inicio Real',
    'Fecha Fin Real',
    'Delta Inicio (días)',
    'Delta Fin (días)',
    'Horas Plan',
    'Horas Reales',
    'Delta Horas',
    '% Avance',
  ]
  const actRows = actItems.map((v) => [
    v.faseNombre ?? '',
    v.edtNombre ?? '',
    v.nombre,
    formatDate(v.fechaInicioPlan),
    formatDate(v.fechaFinPlan),
    formatDate(v.fechaInicioReal),
    formatDate(v.fechaFinReal),
    v.deltaIniciosDias ?? '',
    v.deltaFinDias ?? '',
    v.horasPlan,
    v.horasReales,
    v.deltaHoras,
    v.porcentajeReal,
  ])
  const wsAct = XLSX.utils.aoa_to_sheet([actHeader, ...actRows])
  wsAct['!cols'] = actHeader.map(() => ({ wch: 18 }))
  XLSX.utils.book_append_sheet(wb, wsAct, 'Varianza por Actividad')

  // --- Sheet 4: Varianza por Tarea ---
  const tareaItems = varianzas.filter((v) => v.nivel === 'tarea')
  const tareaHeader = [
    'Fase',
    'EDT',
    'Actividad',
    'Tarea',
    'Fecha Inicio Plan',
    'Fecha Fin Plan',
    'Fecha Inicio Real',
    'Fecha Fin Real',
    'Delta Inicio (días)',
    'Delta Fin (días)',
    'Horas Plan',
    'Horas Reales',
    'Delta Horas',
    '% Avance',
  ]
  const tareaRows = tareaItems.map((v) => [
    v.faseNombre ?? '',
    v.edtNombre ?? '',
    v.actividadNombre ?? '',
    v.nombre,
    formatDate(v.fechaInicioPlan),
    formatDate(v.fechaFinPlan),
    formatDate(v.fechaInicioReal),
    formatDate(v.fechaFinReal),
    v.deltaIniciosDias ?? '',
    v.deltaFinDias ?? '',
    v.horasPlan,
    v.horasReales,
    v.deltaHoras,
    v.porcentajeReal,
  ])
  const wsTarea = XLSX.utils.aoa_to_sheet([tareaHeader, ...tareaRows])
  wsTarea['!cols'] = tareaHeader.map(() => ({ wch: 18 }))
  XLSX.utils.book_append_sheet(wb, wsTarea, 'Varianza por Tarea')

  // --- Download ---
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const link = document.createElement('a')
  link.href = url
  link.download = `Varianza_${nombreProyecto}_${date}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
