/**
 * Anexo A del plan: el organigrama como FORMAS de Word (un cuadro por cargo
 * y conectores), agrupadas en un solo dibujo — en Word se mueve un cuadro,
 * se corrige un nombre o se cambian colores, y el texto sale nítido. Antes
 * era una captura PNG chica generada en el navegador.
 *
 * El layout es un árbol clásico (padre centrado sobre sus hijos). Si el
 * árbol es muy ancho para la hoja horizontal, los grupos de hijos que no
 * tienen a su vez hijos se apilan en vertical bajo su jefe.
 */
import { ANCHO_HORIZONTAL } from './ganttDocx'

export interface NodoOrganigrama {
  id: string
  parentId: string | null
  orden: number
  cargo: string
  /** null = cargo vacante. */
  nombre: string | null
  esFijoGys: boolean
  /** Empresa si no es GYS (personal del cliente o subcontrata). */
  empresa: string | null
}

const EMU_POR_TWIP = 635
const ANCHO_EMU = ANCHO_HORIZONTAL * EMU_POR_TWIP
const FUENTE = 'Arial Narrow'
const MAX_SLOTS_SIN_APILAR = 12
/** Alto disponible bajo el encabezado y el título del anexo en la hoja horizontal. */
const ALTO_MAXIMO = 4250000

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface CajaOrganigrama { nodo: NodoOrganigrama; x: number; y: number; w: number; h: number }
export interface LineaOrganigrama { x1: number; y1: number; x2: number; y2: number }

export function layoutOrganigrama(nodos: NodoOrganigrama[], escala = 1): { cajas: CajaOrganigrama[]; lineas: LineaOrganigrama[]; ancho: number; alto: number } {
  const ids = new Set(nodos.map(n => n.id))
  const hijos = new Map<string, NodoOrganigrama[]>()
  const raices: NodoOrganigrama[] = []
  for (const n of [...nodos].sort((a, b) => a.orden - b.orden)) {
    if (n.parentId && ids.has(n.parentId)) hijos.set(n.parentId, [...(hijos.get(n.parentId) ?? []), n])
    else raices.push(n)
  }
  const hijosDe = (n: NodoOrganigrama) => hijos.get(n.id) ?? []
  const esHoja = (n: NodoOrganigrama) => hijosDe(n).length === 0

  let apilar = false
  const seApila = (n: NodoOrganigrama) => apilar && hijosDe(n).length >= 2 && hijosDe(n).every(esHoja)
  const slots = (n: NodoOrganigrama): number =>
    esHoja(n) || seApila(n) ? 1 : hijosDe(n).reduce((s, h) => s + slots(h), 0)
  let total = raices.reduce((s, r) => s + slots(r), 0)
  if (total > MAX_SLOTS_SIN_APILAR) {
    apilar = true
    total = raices.reduce((s, r) => s + slots(r), 0)
  }

  const anchoSlot = ANCHO_EMU / Math.max(total, 1)
  const w = Math.min(anchoSlot * 0.88, 1900000)
  const h = 560000 * escala
  const separacionV = 330000 * escala
  const separacionPila = 140000 * escala
  const cajas: CajaOrganigrama[] = []
  const lineas: LineaOrganigrama[] = []

  const ubicar = (n: NodoOrganigrama, xInicio: number, y: number) => {
    const centro = xInicio + (slots(n) * anchoSlot) / 2
    const caja = { nodo: n, x: centro - w / 2, y, w, h }
    cajas.push(caja)
    const hs = hijosDe(n)
    if (hs.length === 0) return

    if (seApila(n)) {
      // Hijos uno debajo de otro, colgando de una línea vertical a la izquierda.
      const xLinea = caja.x + w * 0.08
      const wHijo = w * 0.88
      let yHijo = y + h + separacionPila
      for (const hijo of hs) {
        cajas.push({ nodo: hijo, x: caja.x + w * 0.12, y: yHijo, w: wHijo, h })
        lineas.push({ x1: xLinea, y1: yHijo + h / 2, x2: caja.x + w * 0.12, y2: yHijo + h / 2 })
        yHijo += h + separacionPila
      }
      lineas.push({ x1: xLinea, y1: y + h, x2: xLinea, y2: yHijo - separacionPila - h / 2 })
      return
    }

    const yBus = y + h + separacionV / 2
    lineas.push({ x1: centro, y1: y + h, x2: centro, y2: yBus })
    let x = xInicio
    const centros: number[] = []
    for (const hijo of hs) {
      centros.push(x + (slots(hijo) * anchoSlot) / 2)
      ubicar(hijo, x, y + h + separacionV)
      x += slots(hijo) * anchoSlot
    }
    if (centros.length > 1) lineas.push({ x1: centros[0], y1: yBus, x2: centros[centros.length - 1], y2: yBus })
    for (const c of centros) lineas.push({ x1: c, y1: yBus, x2: c, y2: y + h + separacionV })
  }

  let x = 0
  for (const r of raices) {
    ubicar(r, x, 0)
    x += slots(r) * anchoSlot
  }
  const alto = Math.max(...cajas.map(c => c.y + c.h), h)
  return { cajas, lineas, ancho: ANCHO_EMU, alto }
}

function parrafo(texto: string, sz: number, { negrita = false, cursiva = false, color = '1F1F1F', mayusculas = false } = {}): string {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="216" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="${FUENTE}" w:cs="${FUENTE}" w:eastAsia="${FUENTE}" w:hAnsi="${FUENTE}"/>${negrita ? '<w:b/><w:bCs/>' : ''}${cursiva ? '<w:i/>' : ''}${mayusculas ? '<w:caps/>' : ''}` +
    `<w:color w:val="${color}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(texto)}</w:t></w:r></w:p>`
}

function forma(id: number, c: CajaOrganigrama): string {
  const n = c.nodo
  const oscuro = n.esFijoGys
  const angosta = c.w < 1100000 || c.h < 470000
  const sz = { cargo: angosta ? 12 : 14, nombre: angosta ? 14 : 17, extra: angosta ? 11 : 12 }
  const contenido =
    parrafo(n.cargo, sz.cargo, { negrita: true, mayusculas: true, color: oscuro ? 'C9D3F5' : '2F5496' }) +
    (n.nombre
      ? parrafo(n.nombre, sz.nombre, { negrita: true, color: oscuro ? 'FFFFFF' : '1F1F1F' })
      : parrafo('VACANTE', sz.nombre, { negrita: true, cursiva: true, color: 'C00000' })) +
    (n.empresa ? parrafo(n.empresa, sz.extra, { color: oscuro ? 'C9D3F5' : '7F7F7F' }) : '')
  const relleno = oscuro ? '2E4057' : n.nombre ? 'FFFFFF' : 'FDF2F2'
  const borde = oscuro ? '1E2D3D' : n.nombre ? '8EA9DB' : 'E6A0A0'
  return `<wps:wsp><wps:cNvPr id="${id}" name="Cargo ${id}"/><wps:cNvSpPr/>` +
    `<wps:spPr><a:xfrm><a:off x="${Math.round(c.x)}" y="${Math.round(c.y)}"/><a:ext cx="${Math.round(c.w)}" cy="${Math.round(c.h)}"/></a:xfrm>` +
    `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 10000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="${relleno}"/></a:solidFill>` +
    `<a:ln w="12700"><a:solidFill><a:srgbClr val="${borde}"/></a:solidFill>${n.nombre ? '' : '<a:prstDash val="dash"/>'}</a:ln></wps:spPr>` +
    `<wps:txbx><w:txbxContent>${contenido}</w:txbxContent></wps:txbx>` +
    `<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="36000" tIns="18000" rIns="36000" bIns="18000" anchor="ctr" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp>`
}

function linea(id: number, l: LineaOrganigrama): string {
  const x = Math.round(Math.min(l.x1, l.x2)), y = Math.round(Math.min(l.y1, l.y2))
  const cx = Math.round(Math.abs(l.x2 - l.x1)), cy = Math.round(Math.abs(l.y2 - l.y1))
  return `<wps:wsp><wps:cNvPr id="${id}" name="Conector ${id}"/><wps:cNvCnPr/>` +
    `<wps:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom>` +
    `<a:ln w="12700"><a:solidFill><a:srgbClr val="7F7F7F"/></a:solidFill></a:ln></wps:spPr><wps:bodyPr/></wps:wsp>`
}

/** Párrafo con el organigrama como un grupo de formas (inline, centrado). '' si no hay nodos. */
export function xmlOrganigrama(nodos: NodoOrganigrama[]): string {
  if (nodos.length === 0) return ''
  // Todas las alturas escalan con `escala`: si no entra en la hoja, se comprime lo justo.
  let layout = layoutOrganigrama(nodos)
  if (layout.alto > ALTO_MAXIMO) layout = layoutOrganigrama(nodos, ALTO_MAXIMO / layout.alto)
  const { cajas, lineas, ancho, alto } = layout
  let id = 97000
  const formas = [...lineas.map(l => linea(++id, l)), ...cajas.map(c => forma(++id, c))].join('')
  return `<w:p><w:pPr><w:spacing w:before="120" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${ancho}" cy="${Math.round(alto)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="96999" name="Organigrama"/><wp:cNvGraphicFramePr/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">` +
    `<wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${ancho}" cy="${Math.round(alto)}"/><a:chOff x="0" y="0"/><a:chExt cx="${ancho}" cy="${Math.round(alto)}"/></a:xfrm></wpg:grpSpPr>` +
    `${formas}</wpg:wgp></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}
