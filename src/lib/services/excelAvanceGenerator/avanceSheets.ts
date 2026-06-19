import { strFromU8, strToU8 } from 'fflate'
import type { ArbolAvanceResultado, NodoAvance } from '@/lib/services/arbolAvance'

// Rellena las hojas "Avance" (sheet3) y "Curva S" (sheet4) de la plantilla por inyección
// XML/ZIP, siguiendo el diseño validado: matriz jerárquica con pesos + fórmulas, y cuadro
// PREVISTO/REAL que lee de Avance. (El gráfico nativo de la Curva S queda como TODO.)

const SHEET3 = 'xl/worksheets/sheet3.xml' // Avance
const SHEET4 = 'xl/worksheets/sheet4.xml' // Curva S
const EPOCH_EXCEL = Date.UTC(1899, 11, 30)
const DAY = 86_400_000

// Estilos (índices ya presentes en styles.xml de la plantilla).
const S_NAR = 433, S_GRIS = 434, S_AZ = 435, S_RJ = 436, S_PCT = 437, S_GRISPCT = 438, S_EDT = 439, S_ACT = 440, S_EDTPCT = 441

// ── helpers ──
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
function colLetter(n: number): string { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }
function excelSerial(d: Date): number { return Math.floor((d.getTime() - EPOCH_EXCEL) / DAY) }
function toDay(d: Date): number { return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) }
function getMonday(ms: number): number { const d = new Date(ms); const day = d.getUTCDay(); const diff = day === 0 ? -6 : 1 - day; return ms + diff * DAY }

type Kind = 'str' | 'num' | 'formula' | 'empty'
/** Construye una celda <c> con estilo opcional. */
function cell(ref: string, s: number | null, kind: Kind, value?: string | number): string {
  const sa = s != null ? ` s="${s}"` : ''
  if (kind === 'empty') return `<c r="${ref}"${sa}/>`
  if (kind === 'str') return `<c r="${ref}"${sa} t="inlineStr"><is><t xml:space="preserve">${esc(String(value))}</t></is></c>`
  if (kind === 'formula') return `<c r="${ref}"${sa}><f>${esc(String(value))}</f></c>`
  return `<c r="${ref}"${sa}><v>${value}</v></c>` // num
}

/** Inserta/parchea una celda en un XML de hoja (crea celda/fila si faltan, en orden). */
function setCell(xml: string, ref: string, s: number | null, kind: Kind, value?: string | number): string {
  const m = ref.match(/^([A-Z]+)(\d+)$/); if (!m) return xml
  const rowNum = m[2]; const targetCol = colNum(m[1])
  const nueva = cell(ref, s, kind, value)
  const cellRe = new RegExp(`<c r="${ref}"(?:[^>]*?)(?:/>|>[\\s\\S]*?</c>)`)
  if (cellRe.test(xml)) return xml.replace(cellRe, nueva)
  const rowRe = new RegExp(`(<row r="${rowNum}"[^>]*>)([\\s\\S]*?)(</row>)`)
  const rm = rowRe.exec(xml)
  if (rm) {
    const inner = rm[2]
    const tags = inner.match(/<c r="[A-Z]+\d+"[\s\S]*?(?:\/>|<\/c>)/g) ?? []
    let pos = inner.length
    for (const tag of tags) { const cr = tag.match(/<c r="([A-Z]+)\d+"/); if (cr && colNum(cr[1]) > targetCol) { pos = inner.indexOf(tag); break } }
    return xml.slice(0, rm.index) + rm[1] + inner.slice(0, pos) + nueva + inner.slice(pos) + rm[3] + xml.slice(rm.index + rm[0].length)
  }
  const newRow = `<row r="${rowNum}">${nueva}</row>`
  const rowsRe = /<row r="(\d+)"[^>]*>/g
  let mt: RegExpExecArray | null, insertPos = -1
  while ((mt = rowsRe.exec(xml))) { if (Number(mt[1]) > Number(rowNum)) { insertPos = mt.index; break } }
  if (insertPos === -1) { const sd = xml.indexOf('</sheetData>'); return sd === -1 ? xml : xml.slice(0, sd) + newRow + xml.slice(sd) }
  return xml.slice(0, insertPos) + newRow + xml.slice(insertPos)
}
function colNum(letras: string): number { let n = 0; for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64); return n }

interface Semana { start: number; corte: number }
function construirSemanas(rangeStart: number, rangeEnd: number): Semana[] {
  const firstMon = getMonday(rangeStart), lastMon = getMonday(rangeEnd)
  const out: Semana[] = []
  for (let cur = firstMon; cur <= lastMon && out.length < 60; cur += 7 * DAY) out.push({ start: cur, corte: cur + 6 * DAY })
  return out
}
/** % planeado acumulado de una tarea a una fecha de corte (prorrateo por solape de días). */
function lb0Frac(ini: Date | null, fin: Date | null, corteMs: number): number {
  if (!ini || !fin) return 0
  const s = toDay(ini), f = toDay(fin)
  if (corteMs < s) return 0
  const total = (f - s) / DAY + 1
  if (total <= 0) return 0
  const elapsed = (Math.min(f, corteMs) - s) / DAY + 1
  return Math.min(1, elapsed / total)
}
const round4 = (n: number) => Math.round(n * 10000) / 10000

// ── Layout de la matriz ──
interface TareaLay { nodo: NodoAvance; lb0Row: number; realRow: number; d: number }
interface FaseLay { nodo: NodoAvance; lb0Row: number; realRow: number; horasFase: number; pesoFaseDec: number; firstTaskRow: number | null; lastTaskRow: number | null; firstEdtRow: number | null; edts: { nodo: NodoAvance; row: number }[]; acts: { nodo: NodoAvance; row: number }[]; tareas: TareaLay[] }

/** Rellena la hoja Avance (sheet3) a partir del árbol de ejecución. */
export function inyectarHojaAvance(files: Record<string, Uint8Array>, arbol: ArbolAvanceResultado): void {
  let xml = strFromU8(files[SHEET3])

  // 1. Asignar filas (desde la 15) y calcular d (peso parcial dentro de la fase).
  let r = 15
  const fases: FaseLay[] = []
  for (const fase of arbol.ejecucion) {
    const fl: FaseLay = { nodo: fase, lb0Row: r, realRow: r + 1, horasFase: fase.horasHombre, pesoFaseDec: round4(fase.pesoGlobal / 100), firstTaskRow: null, lastTaskRow: null, firstEdtRow: null, edts: [], acts: [], tareas: [] }
    r += 2
    fase.hijos.forEach((edt, ei) => {
      const edtRow = r; r += 1; fl.edts.push({ nodo: edt, row: edtRow }); if (ei === 0) fl.firstEdtRow = edtRow
      edt.hijos.forEach((act) => {
        const actRow = r; r += 1; fl.acts.push({ nodo: act, row: actRow })
        act.hijos.forEach((tarea) => {
          const lb0Row = r, realRow = r + 1; r += 2
          fl.tareas.push({ nodo: tarea, lb0Row, realRow, d: 0 })
          if (fl.firstTaskRow == null) fl.firstTaskRow = lb0Row
          fl.lastTaskRow = realRow
        })
      })
    })
    // d = hhTarea/hhFase (4 dec); la última tarea con hh>0 absorbe el sobrante → Σ=1.0
    let lastIdx = -1
    fl.tareas.forEach((t, i) => { if (t.nodo.horasHombre > 0) lastIdx = i })
    fl.tareas.forEach((t) => { t.d = fl.horasFase > 0 ? round4(t.nodo.horasHombre / fl.horasFase) : 0 })
    if (lastIdx >= 0 && fl.horasFase > 0) {
      const sumOtros = fl.tareas.reduce((s, t, i) => (i === lastIdx ? s : s + t.d), 0)
      fl.tareas[lastIdx].d = round4(1 - sumOtros)
    }
    fases.push(fl)
  }

  // 2. Semanas (rango = min/max de fechas de las tareas de ejecución).
  const fechas: number[] = []
  for (const fl of fases) for (const t of fl.tareas) { if (t.nodo.fechaInicio) fechas.push(t.nodo.fechaInicio.getTime()); if (t.nodo.fechaFin) fechas.push(t.nodo.fechaFin.getTime()) }
  const semanas = fechas.length ? construirSemanas(Math.min(...fechas), Math.max(...fechas)) : []
  const N = semanas.length
  const W0 = 6 // primera columna de semana = F
  const wcol = (i: number) => colLetter(W0 + i)
  const lastCol = W0 + Math.max(0, N - 1)

  // 3. Cabecera de semanas (filas 10/11) + globales (12/13).
  for (let i = 0; i < N; i++) {
    xml = setCell(xml, `${wcol(i)}10`, S_NAR, 'str', `Sem ${i + 1}`)
    xml = setCell(xml, `${wcol(i)}11`, S_NAR, 'num', excelSerial(new Date(semanas[i].corte)))
    const L = wcol(i)
    xml = setCell(xml, `${L}12`, S_PCT, 'formula', fases.map((f) => `$D$${f.lb0Row}*${L}${f.lb0Row}`).join('+') || '0')
    xml = setCell(xml, `${L}13`, S_PCT, 'formula', fases.map((f) => `$D$${f.realRow}*${L}${f.realRow}`).join('+') || '0')
  }

  // 4. Matriz (filas 15+). Acumular en Map<rowNum, xml> y ordenar al final para que Excel
  //    no rechace el archivo por filas fuera de orden (los EDTs/ACTs/TAREAs tienen row-numbers
  //    intercalados pero se generan en bloques separados).
  const filasMap = new Map<number, string>()
  const addRow = (n: number, inner: string) => filasMap.set(n, `<row r="${n}">${inner}</row>`)
  const indent = (nivel: number, nombre: string) => '  '.repeat(Math.max(0, nivel - 1)) + nombre
  for (const fl of fases) {
    const first = fl.firstTaskRow ?? fl.lb0Row, last = fl.lastTaskRow ?? fl.realRow
    // FASE — fila LB 0
    let c = [cell(`A${fl.lb0Row}`, S_GRIS, 'str', fl.nodo.wbs), cell(`B${fl.lb0Row}`, S_GRIS, 'str', indent(1, fl.nodo.nombre)),
      cell(`C${fl.lb0Row}`, S_GRISPCT, 'formula', `SUM(C${first}:C${last})`), cell(`D${fl.lb0Row}`, S_GRISPCT, 'num', fl.pesoFaseDec),
      cell(`E${fl.lb0Row}`, S_GRIS, 'str', 'LB 0')]
    for (let i = 0; i < N; i++) c.push(cell(`${wcol(i)}${fl.lb0Row}`, S_GRISPCT, 'formula', `SUMPRODUCT($D$${first}:$D$${last},${wcol(i)}${first}:${wcol(i)}${last})`))
    addRow(fl.lb0Row, c.join(''))
    // FASE — fila REAL
    c = [cell(`A${fl.realRow}`, S_GRIS, 'empty'), cell(`B${fl.realRow}`, S_GRIS, 'empty'), cell(`C${fl.realRow}`, S_GRIS, 'empty'),
      cell(`D${fl.realRow}`, S_GRISPCT, 'formula', `+D${fl.lb0Row}`), cell(`E${fl.realRow}`, S_GRIS, 'str', 'REAL')]
    for (let i = 0; i < N; i++) c.push(cell(`${wcol(i)}${fl.realRow}`, S_GRISPCT, 'formula', `SUMPRODUCT($D$${first}:$D$${last},${wcol(i)}${first + 1}:${wcol(i)}${last + 1})`))
    addRow(fl.realRow, c.join(''))

    // EDTs (decorativos, 1 fila)
    for (const e of fl.edts) {
      c = [cell(`A${e.row}`, S_EDT, 'str', e.nodo.wbs), cell(`B${e.row}`, S_EDT, 'str', indent(2, e.nodo.nombre)), cell(`C${e.row}`, S_EDT, 'empty')]
      if (e.row === fl.firstEdtRow) c.push(cell(`D${e.row}`, S_EDTPCT, 'formula', `SUM(D${first}:D${last})`))
      else c.push(cell(`D${e.row}`, S_EDT, 'empty'))
      c.push(cell(`E${e.row}`, S_EDT, 'str', '---'))
      for (let i = 0; i < N; i++) c.push(cell(`${wcol(i)}${e.row}`, S_EDT, 'empty'))
      addRow(e.row, c.join(''))
    }
    // ACTs (decorativos, 1 fila)
    for (const a of fl.acts) {
      c = [cell(`A${a.row}`, S_ACT, 'str', a.nodo.wbs), cell(`B${a.row}`, S_ACT, 'str', indent(3, a.nodo.nombre)), cell(`C${a.row}`, S_ACT, 'empty'), cell(`D${a.row}`, S_ACT, 'empty'), cell(`E${a.row}`, S_ACT, 'str', '---')]
      for (let i = 0; i < N; i++) c.push(cell(`${wcol(i)}${a.row}`, S_ACT, 'empty'))
      addRow(a.row, c.join(''))
    }
    // TAREAS (2 filas)
    for (const t of fl.tareas) {
      c = [cell(`A${t.lb0Row}`, null, 'str', t.nodo.wbs), cell(`B${t.lb0Row}`, null, 'str', indent(4, t.nodo.nombre)),
        cell(`C${t.lb0Row}`, S_PCT, 'formula', `D${t.lb0Row}*$D$${fl.lb0Row}`), cell(`D${t.lb0Row}`, S_PCT, 'num', t.d), cell(`E${t.lb0Row}`, null, 'str', 'LB 0')]
      for (let i = 0; i < N; i++) { const v = round4(lb0Frac(t.nodo.fechaInicio, t.nodo.fechaFin, semanas[i].corte)); if (v > 0) c.push(cell(`${wcol(i)}${t.lb0Row}`, S_AZ, 'num', v)) }
      addRow(t.lb0Row, c.join(''))
      // REAL: D vacío (clave para el SUMPRODUCT); última semana = %compl/100 si >0
      c = [cell(`A${t.realRow}`, null, 'empty'), cell(`B${t.realRow}`, null, 'empty'), cell(`E${t.realRow}`, null, 'str', 'REAL')]
      if (N > 0 && t.nodo.porcentajeCompletado > 0) c.push(cell(`${wcol(N - 1)}${t.realRow}`, S_RJ, 'num', round4(t.nodo.porcentajeCompletado / 100)))
      addRow(t.realRow, c.join(''))
    }
  }

  // Insertar las filas ordenadas numéricamente antes de </sheetData>.
  const xmlFilas = [...filasMap.keys()].sort((a, b) => a - b).map((n) => filasMap.get(n)!).join('')
  const sd = xml.indexOf('</sheetData>')
  if (sd !== -1) xml = xml.slice(0, sd) + xmlFilas + xml.slice(sd)
  // Ampliar dimension si hace falta.
  xml = xml.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:${colLetter(lastCol)}${r}"/>`)

  files[SHEET3] = strToU8(xml)
}

/** Rellena la hoja Curva S (sheet4): cuadro PREVISTO/REAL + gráfico nativo de líneas. */
export function inyectarHojaCurvaS(files: Record<string, Uint8Array>, semanasN?: number): void {
  let xml = strFromU8(files[SHEET4])

  // N de semanas: derivar de la hoja Avance (cuántas columnas de corte hay en F11..).
  const av = strFromU8(files[SHEET3])
  const mRow11 = av.match(/<row r="11"[^>]*>([\s\S]*?)<\/row>/)
  const N = semanasN ?? (mRow11 ? (mRow11[1].match(/<c r="[F-Z]+11"/g)?.length ?? 0) : 0)
  if (N <= 0) { files[SHEET4] = strToU8(xml); return }

  const C0 = 3 // primera columna de la Curva S = C
  const ccol = (i: number) => colLetter(C0 + i)
  const acol = (i: number) => colLetter(6 + i) // columna equivalente en Avance (F..)

  for (let i = 0; i < N; i++) {
    xml = setCell(xml, `${ccol(i)}8`, S_NAR, 'str', `Sem ${i + 1}`)
    // Fecha de corte: primera lee de Avance!F11; las demás = anterior + 7
    xml = setCell(xml, `${ccol(i)}9`, null, 'formula', i === 0 ? `+Avance!${acol(0)}11` : `${ccol(i - 1)}9+7`)
    xml = setCell(xml, `${ccol(i)}10`, S_PCT, 'formula', `+Avance!${acol(i)}12`) // PREVISTO ← Gbl LB0
    xml = setCell(xml, `${ccol(i)}11`, S_PCT, 'formula', `+Avance!${acol(i)}13`) // REAL ← Gbl REAL
    xml = setCell(xml, `${ccol(i)}13`, S_PCT, 'formula', `${ccol(i)}11-${ccol(i)}10`) // variación
  }

  // ── Gráfico nativo: line chart con 2 series (PREVISTO azul, REAL verde) ──────────────────
  const lastCol = ccol(N - 1)
  const catRef  = `'Curva S'!$C$8:$${lastCol}$8`
  const NS_R_VAL  = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const NS_REL  = 'http://schemas.openxmlformats.org/package/2006/relationships'
  const NS_C    = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
  const NS_A    = 'http://schemas.openxmlformats.org/drawingml/2006/main'
  const NS_XDR  = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'

  const lineSerie = (idx: number, color: string, valRow: number, txRef: string, txVal: string) =>
    `<c:ser>` +
    `<c:idx val="${idx}"/><c:order val="${idx}"/>` +
    `<c:tx><c:strRef><c:f>${txRef}</c:f>` +
    `<c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${txVal}</c:v></c:pt></c:strCache>` +
    `</c:strRef></c:tx>` +
    `<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr>` +
    `<c:marker><c:symbol val="none"/></c:marker>` +
    `<c:cat><c:strRef><c:f>${catRef}</c:f></c:strRef></c:cat>` +
    `<c:val><c:numRef><c:f>'Curva S'!$C$${valRow}:$${lastCol}$${valRow}</c:f></c:numRef></c:val>` +
    `<c:smooth val="0"/>` +
    `</c:ser>`

  // 1. chart1.xml
  files['xl/charts/chart1.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R_VAL}">` +
    `<c:chart>` +
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Curva S de Avance</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>` +
    `<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea><c:layout/>` +
    `<c:lineChart>` +
    `<c:grouping val="standard"/><c:varyColors val="0"/>` +
    lineSerie(0, '0000FF', 10, `'Curva S'!$B$10`, 'PREVISTO') +
    lineSerie(1, '00B050', 11, `'Curva S'!$B$11`, 'REAL') +
    `<c:axId val="111111111"/><c:axId val="222222222"/>` +
    `</c:lineChart>` +
    `<c:catAx>` +
    `<c:axId val="111111111"/>` +
    `<c:scaling><c:orientation val="minMax"/></c:scaling>` +
    `<c:delete val="0"/><c:axPos val="b"/>` +
    `<c:crossAx val="222222222"/>` +
    `</c:catAx>` +
    `<c:valAx>` +
    `<c:axId val="222222222"/>` +
    `<c:scaling><c:orientation val="minMax"/><c:min val="0"/><c:max val="1"/></c:scaling>` +
    `<c:delete val="0"/><c:axPos val="l"/>` +
    `<c:numFmt formatCode="0%" sourceLinked="0"/>` +
    `<c:crossAx val="111111111"/>` +
    `</c:valAx>` +
    `</c:plotArea>` +
    `<c:legend><c:legendPos val="b"/></c:legend>` +
    `<c:plotVisOnly val="1"/>` +
    `</c:chart>` +
    `</c:chartSpace>`
  )

  // 2. drawing_curvas.xml — nombre distinto a drawing1/drawing2 usados por fotos/logos
  files['xl/drawings/drawing_curvas.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}" xmlns:r="${NS_R_VAL}">` +
    `<xdr:twoCellAnchor>` +
    `<xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>14</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
    `<xdr:to><xdr:col>13</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>37</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
    `<xdr:graphicFrame macro="">` +
    `<xdr:nvGraphicFramePr>` +
    `<xdr:cNvPr id="2" name="Curva S Chart"/>` +
    `<xdr:cNvGraphicFramePr/>` +
    `</xdr:nvGraphicFramePr>` +
    `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
    `<a:graphic>` +
    `<a:graphicData uri="${NS_C}">` +
    `<c:chart xmlns:c="${NS_C}" r:id="rId1"/>` +
    `</a:graphicData>` +
    `</a:graphic>` +
    `</xdr:graphicFrame>` +
    `<xdr:clientData/>` +
    `</xdr:twoCellAnchor>` +
    `</xdr:wsDr>`
  )

  // 3. drawing_curvas.xml.rels
  files['xl/drawings/_rels/drawing_curvas.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="${NS_REL}">` +
    `<Relationship Id="rId1" Type="${NS_R_VAL}/chart" Target="../charts/chart1.xml"/>` +
    `</Relationships>`
  )

  // 4. sheet4.xml.rels — crear o fusionar
  const sheet4RelsKey = 'xl/worksheets/_rels/sheet4.xml.rels'
  const prevRels = files[sheet4RelsKey] ? strFromU8(files[sheet4RelsKey]) : null
  const prevIds  = prevRels ? [...prevRels.matchAll(/Id="rId(\d+)"/g)].map(m => Number(m[1])) : []
  const rIdDraw  = `rId${prevIds.length ? Math.max(...prevIds) + 1 : 1}`
  const drawRel  = `<Relationship Id="${rIdDraw}" Type="${NS_R_VAL}/drawing" Target="../drawings/drawing_curvas.xml"/>`
  files[sheet4RelsKey] = strToU8(
    prevRels
      ? prevRels.replace('</Relationships>', drawRel + '</Relationships>')
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="${NS_REL}">${drawRel}</Relationships>`
  )

  // 5. sheet4.xml: xmlns:r ya existe en la plantilla; añadir <drawing> justo antes de </worksheet>
  if (!/xmlns:r=/.test(xml)) xml = xml.replace('<worksheet ', `<worksheet xmlns:r="${NS_R_VAL}" `)
  xml = xml.replace('</worksheet>', `<drawing r:id="${rIdDraw}"/></worksheet>`)
  files[SHEET4] = strToU8(xml)

  // 6. [Content_Types].xml
  let ct = strFromU8(files['[Content_Types].xml'])
  const ctAdd = [
    { part: '/xl/charts/chart1.xml',            ct: 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml' },
    { part: '/xl/drawings/drawing_curvas.xml',   ct: 'application/vnd.openxmlformats-officedocument.drawing+xml' },
  ]
  for (const e of ctAdd) {
    if (!ct.includes(`PartName="${e.part}"`))
      ct = ct.replace('</Types>', `<Override PartName="${e.part}" ContentType="${e.ct}"/></Types>`)
  }
  files['[Content_Types].xml'] = strToU8(ct)
}
