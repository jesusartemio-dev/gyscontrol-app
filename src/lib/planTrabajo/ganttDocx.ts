/**
 * Anexo B del plan: cronograma como tabla Gantt nativa de Word (barras =
 * celdas sombreadas), en hoja horizontal. Dos vistas:
 * - B.1 general, columnas por SEMANA: fase › EDT › actividad (+ hitos).
 * - B.2 detalle, columnas por DÍA y una tabla por mes: solo Construcción y
 *   Comisionamiento, hasta la tarea y con su recurso — tareas de 1 a 3 días
 *   que en semanas no se distinguen.
 * Las filas vienen del cronograma de planificación (Línea Base), ver
 * cargarDatosAnexos.ts. Se edita en Word como cualquier tabla.
 */

/** Marcador que deja la plantilla en cada anexo; exportDocx lo reemplaza por el XML nativo. */
export const marcadorAnexo = (clave: 'organigrama' | 'ganttGeneral' | 'ganttDetalle') => `§ANEXO:${clave}§`

export type NivelGantt = 'fase' | 'edt' | 'actividad' | 'tarea' | 'hito'

export interface FilaGantt {
  nivel: NivelGantt
  nombre: string
  /** 'YYYY-MM-DD' (hora de obra, sin zona). Un hito tiene inicio = fin. */
  inicio: string | null
  fin: string | null
  hh?: number
  recurso?: string
  /** Para el color de la barra (una paleta por fase). */
  faseIndice: number
}

export interface DatosGantt {
  general: FilaGantt[]
  detalle: FilaGantt[]
}

/** Ancho útil de una hoja A4 horizontal con los márgenes de la plantilla (16837 − 2 × 1133). */
export const ANCHO_HORIZONTAL = 14571
const FUENTE = 'Arial Narrow'
const COLORES_FASE = ['4472C4', 'ED7D31', '70AD47', 'FFC000', '5B9BD5', '7030A0', 'A5A5A5', '264478', '9E480E', '43682B']
const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const aFecha = (s: string) => new Date(`${s}T00:00:00Z`)
const aTexto = (d: Date) => d.toISOString().slice(0, 10)
const sumarDias = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
const ddmm = (s: string | null) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '')

/** Mezcla un color con blanco (0 = igual, 1 = blanco), para las barras de niveles inferiores. */
function aclarar(hex: string, factor: number): string {
  const c = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
  return c.map(v => Math.round(v + (255 - v) * factor).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function colorBarra(f: FilaGantt): string {
  const base = COLORES_FASE[f.faseIndice % COLORES_FASE.length]
  if (f.nivel === 'fase' || f.nivel === 'edt') return base
  if (f.nivel === 'actividad') return aclarar(base, 0.35)
  return aclarar(base, 0.15)
}

const formatoHH = (hh?: number) => (hh ? String(Math.round(hh * 10) / 10) : '')

// ─── celdas ───

interface OpcionesCelda {
  sz?: number
  negrita?: boolean
  cursiva?: boolean
  jc?: 'left' | 'center' | 'right'
  fondo?: string
  span?: number
  sangria?: number
  color?: string
}

function celda(ancho: number, texto: string, o: OpcionesCelda = {}): string {
  const sz = o.sz ?? 16
  const rPr = `<w:rPr><w:rFonts w:ascii="${FUENTE}" w:cs="${FUENTE}" w:eastAsia="${FUENTE}" w:hAnsi="${FUENTE}"/>${o.negrita ? '<w:b/><w:bCs/>' : ''}${o.cursiva ? '<w:i/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`
  return `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${o.span && o.span > 1 ? `<w:gridSpan w:val="${o.span}"/>` : ''}` +
    `${o.fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fondo}"/>` : ''}` +
    `<w:tcMar><w:top w:w="10" w:type="dxa"/><w:left w:w="${o.jc === 'left' ? 50 : 10}" w:type="dxa"/><w:bottom w:w="10" w:type="dxa"/><w:right w:w="10" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>${o.sangria ? `<w:ind w:left="${o.sangria}"/>` : ''}<w:jc w:val="${o.jc ?? 'center'}"/>${rPr}</w:pPr>` +
    `${texto ? `<w:r>${rPr}<w:t xml:space="preserve">${esc(texto)}</w:t></w:r>` : ''}</w:p></w:tc>`
}

const fila = (celdas: string, encabezado = false) =>
  `<w:tr><w:trPr><w:cantSplit/>${encabezado ? '<w:tblHeader/>' : ''}<w:trHeight w:val="230" w:hRule="atLeast"/></w:trPr>${celdas}</w:tr>`

function tabla(anchos: number[], filas: string): string {
  const borde = (lado: string) => `<w:${lado} w:val="single" w:color="A6A6A6" w:sz="4"/>`
  return `<w:tbl><w:tblPr><w:tblW w:w="${anchos.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>` +
    `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(borde).join('')}</w:tblBorders></w:tblPr>` +
    `<w:tblGrid>${anchos.map(a => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>${filas}</w:tbl>`
}

const SANGRIA: Record<NivelGantt, number> = { fase: 0, edt: 120, actividad: 260, tarea: 400, hito: 400 }

/** Celda del nombre según el nivel: fase en mayúsculas y negrita, hitos con ◆. */
function celdaNombre(ancho: number, f: FilaGantt, sz: number): string {
  const texto = f.nivel === 'hito' ? `◆ ${f.nombre}` : f.nivel === 'fase' ? f.nombre.toUpperCase() : f.nombre
  return celda(ancho, texto, {
    sz, jc: 'left', sangria: SANGRIA[f.nivel],
    negrita: f.nivel === 'fase' || f.nivel === 'edt',
    cursiva: f.nivel === 'hito',
    fondo: f.nivel === 'fase' ? 'F2F2F2' : undefined,
  })
}

/** Celda de un período (semana o día): barra si la fila lo cubre, ◆ si un hito cae ahí. */
function celdaPeriodo(ancho: number, f: FilaGantt, desde: string, hasta: string, fondoVacio?: string): string {
  if (!f.inicio || !f.fin || f.fin < desde || f.inicio > hasta) {
    return celda(ancho, '', { fondo: f.nivel === 'fase' ? 'F2F2F2' : fondoVacio })
  }
  if (f.nivel === 'hito') return celda(ancho, '◆', { sz: 16, negrita: true, color: '1F1F1F', fondo: fondoVacio })
  return celda(ancho, '', { fondo: colorBarra(f) })
}

function rango(filas: FilaGantt[]): { min: string; max: string } | null {
  const fechas = filas.flatMap(f => [f.inicio, f.fin]).filter((d): d is string => !!d).sort()
  return fechas.length ? { min: fechas[0], max: fechas[fechas.length - 1] } : null
}

// ─── B.1 general por semanas ───

export function xmlGanttGeneral(filas: FilaGantt[]): string {
  const r = rango(filas)
  if (!r) return ''
  // Semanas de lunes a domingo que cubren todo el proyecto.
  const inicio = aFecha(r.min)
  let lunes = sumarDias(inicio, -((inicio.getUTCDay() + 6) % 7))
  const semanas: { desde: string; hasta: string; mes: number; anio: number }[] = []
  while (aTexto(lunes) <= r.max) {
    const jueves = sumarDias(lunes, 3) // la semana pertenece al mes de su jueves
    semanas.push({ desde: aTexto(lunes), hasta: aTexto(sumarDias(lunes, 6)), mes: jueves.getUTCMonth(), anio: jueves.getUTCFullYear() })
    lunes = sumarDias(lunes, 7)
  }

  const fijas = [4300, 800, 800, 700]
  const anchoSemana = Math.max(220, Math.floor((ANCHO_HORIZONTAL - fijas.reduce((a, b) => a + b, 0)) / semanas.length))
  const anchos = [...fijas, ...semanas.map(() => anchoSemana)]
  const cab = { sz: 15, negrita: true, fondo: 'D9D9D9' }

  // Fila 1: meses (fusionando sus semanas); fila 2: lunes de cada semana.
  const grupos: { etiqueta: string; n: number }[] = []
  for (const s of semanas) {
    const etiqueta = `${MESES[s.mes]} ${s.anio}`
    if (grupos.length && grupos[grupos.length - 1].etiqueta === etiqueta) grupos[grupos.length - 1].n++
    else grupos.push({ etiqueta, n: 1 })
  }
  const cabecera1 = fila(
    celda(fijas[0], 'FASE / EDT / ACTIVIDAD', cab) + celda(fijas[1], 'INICIO', cab) + celda(fijas[2], 'FIN', cab) + celda(fijas[3], 'HH', cab) +
    grupos.map(g => celda(anchoSemana * g.n, g.n > 1 ? g.etiqueta : g.etiqueta.slice(0, 3), { ...cab, span: g.n })).join(''),
    true
  )
  const cabecera2 = fila(
    celda(fijas[0], '', cab) + celda(fijas[1], '', cab) + celda(fijas[2], '', cab) + celda(fijas[3], '', cab) +
    semanas.map(s => celda(anchoSemana, s.desde.slice(8, 10), { ...cab, sz: 13 })).join(''),
    true
  )
  const cuerpo = filas.map(f => fila(
    celdaNombre(fijas[0], f, 15) +
    celda(fijas[1], ddmm(f.inicio), { sz: 15 }) + celda(fijas[2], ddmm(f.fin), { sz: 15 }) +
    celda(fijas[3], formatoHH(f.hh), { sz: 15, negrita: f.nivel !== 'actividad' }) +
    semanas.map(s => celdaPeriodo(anchoSemana, f, s.desde, s.hasta)).join('')
  )).join('')

  return tabla(anchos, cabecera1 + cabecera2 + cuerpo) + parrafoNota('Columnas por semana (lunes a domingo); el número indica el lunes de cada semana. ◆ = hito.')
}

// ─── B.2 detalle por días, una tabla por mes ───

export function xmlGanttDetalle(filas: FilaGantt[]): string {
  const r = rango(filas)
  if (!r) return ''
  const fijas = [3500, 1500, 700, 700]
  const partes: string[] = []

  let cursor = aFecha(`${r.min.slice(0, 7)}-01`)
  while (aTexto(cursor) <= r.max) {
    const anio = cursor.getUTCFullYear(), mes = cursor.getUTCMonth()
    const primerDia = aTexto(cursor) < r.min ? aFecha(r.min) : cursor
    const finMes = sumarDias(new Date(Date.UTC(anio, mes + 1, 1)), -1)
    const ultimoDia = aTexto(finMes) > r.max ? aFecha(r.max) : finMes
    const dias: Date[] = []
    for (let d = primerDia; d <= ultimoDia; d = sumarDias(d, 1)) dias.push(d)
    const desdeMes = aTexto(dias[0]), hastaMes = aTexto(dias[dias.length - 1])
    const filasMes = filas.filter(f => f.inicio && f.fin && f.inicio <= hastaMes && f.fin >= desdeMes)

    if (filasMes.length > 0) {
      const anchoDia = Math.max(150, Math.floor((ANCHO_HORIZONTAL - fijas.reduce((a, b) => a + b, 0)) / dias.length))
      const anchos = [...fijas, ...dias.map(() => anchoDia)]
      const cab = { sz: 14, negrita: true, fondo: 'D9D9D9' }
      const finde = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6
      const cabecera1 = fila(
        celda(fijas[0], 'EDT / ACTIVIDAD / TAREA', cab) + celda(fijas[1], 'RECURSO', cab) + celda(fijas[2], 'INICIO', cab) + celda(fijas[3], 'FIN', cab) +
        celda(anchoDia * dias.length, `${MESES[mes]} ${anio}`, { ...cab, span: dias.length }),
        true
      )
      const cabecera2 = fila(
        fijas.map(a => celda(a, '', cab)).join('') +
        dias.map(d => celda(anchoDia, String(d.getUTCDate()), { ...cab, sz: 12, fondo: finde(d) ? 'BFBFBF' : 'D9D9D9' })).join(''),
        true
      )
      const cabecera3 = fila(
        fijas.map(a => celda(a, '', cab)).join('') +
        dias.map(d => celda(anchoDia, INICIAL_DIA[d.getUTCDay()], { ...cab, sz: 11, negrita: false, fondo: finde(d) ? 'BFBFBF' : 'D9D9D9' })).join(''),
        true
      )
      const cuerpo = filasMes.map(f => fila(
        celdaNombre(fijas[0], f, 14) +
        celda(fijas[1], f.recurso ?? '', { sz: 13, jc: 'left' }) +
        celda(fijas[2], ddmm(f.inicio), { sz: 13 }) + celda(fijas[3], ddmm(f.fin), { sz: 13 }) +
        dias.map(d => { const dia = aTexto(d); return celdaPeriodo(anchoDia, f, dia, dia, finde(d) ? 'F2F2F2' : undefined) }).join('')
      )).join('')
      partes.push(tabla(anchos, cabecera1 + cabecera2 + cabecera3 + cuerpo) + parrafoNota(''))
    }
    cursor = new Date(Date.UTC(anio, mes + 1, 1))
  }
  return partes.join('') + (partes.length ? parrafoNota('Columnas por día; sábados y domingos en gris. ◆ = hito.') : '')
}

function parrafoNota(texto: string): string {
  return `<w:p><w:pPr><w:spacing w:before="40" w:after="160"/></w:pPr>${texto ? `<w:r><w:rPr><w:rFonts w:ascii="${FUENTE}" w:hAnsi="${FUENTE}" w:cs="${FUENTE}"/><w:i/><w:color w:val="595959"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">${esc(texto)}</w:t></w:r>` : ''}</w:p>`
}
