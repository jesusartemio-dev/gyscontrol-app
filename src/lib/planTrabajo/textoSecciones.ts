// Secciones del Plan de Trabajo como TEXTO, para copiar al portapapeles y
// editar en campo (celular/tablet): se copia, se corrige donde sea cómodo
// (WhatsApp, Notas…) y se pega de vuelta.
//
// Formato (el mismo para copiar y para pegar, así la ida y vuelta no pierde datos):
//  - Objetivo / Alcance General: texto tal cual.
//  - Restricciones: una por línea ("- " opcional).
//  - EPP: grupos "BÁSICO", "BIOSEGURIDAD", "RIESGO ESPECÍFICO"; ítems "- nombre | norma".
//  - Herramientas y equipos: grupos "EQUIPOS", "HERRAMIENTAS", "MATERIALES";
//    ítems "- nombre | 2 und | observaciones".
//  - Tablas calculadas (personal, RACI, histogramas, cronograma, referencias): solo copiar.
// Al pegar se conservan los datos que el texto no muestra (categoría de una
// restricción, grupo/observaciones de un EPP) si el ítem sigue igual.

import type {
  PlanEPP, PlanEPPItem, PlanHerramientasYEquipos, PlanItemRecurso, PlanRestriccion,
  PlanPersonal, PlanRaci, PlanHistogramas, PlanCronograma, PlanReferencia, PlanAlcanceDetalladoEdt,
  SeccionRegenerable,
} from '@/types/planTrabajo'

/** Secciones que se pueden editar pegando texto. */
export const SECCIONES_EDITABLES_TEXTO: readonly SeccionRegenerable[] = [
  'objetivo', 'alcanceGeneral', 'eppRequeridos', 'herramientasYEquipos', 'restricciones',
]

const EPP_GRUPOS: [keyof PlanEPP, string][] = [['basico', 'BÁSICO'], ['bioseguridad', 'BIOSEGURIDAD'], ['riesgoEspecifico', 'RIESGO ESPECÍFICO']]
const HERR_GRUPOS: [keyof PlanHerramientasYEquipos, string][] = [['equipos', 'EQUIPOS'], ['herramientas', 'HERRAMIENTAS'], ['materiales', 'MATERIALES']]

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
const sinVineta = (l: string) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '').trim()
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('es-PE', { maximumFractionDigits: 2 }))
const fmtFecha = (s: string) => {
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// ─── A texto ────────────────────────────────────────────────────────────────

export function seccionATexto(seccion: SeccionRegenerable, valor: unknown): string {
  switch (seccion) {
    case 'objetivo':
    case 'alcanceGeneral':
      return typeof valor === 'string' ? valor : ''
    case 'restricciones':
      return ((valor as PlanRestriccion[] | null) ?? []).map((r) => `- ${r.texto}`).join('\n')
    case 'eppRequeridos': {
      const v = (valor as PlanEPP | null) ?? { basico: [], bioseguridad: [], riesgoEspecifico: [] }
      return EPP_GRUPOS.map(([k, t]) =>
        [t, ...(v[k] ?? []).map((i) => `- ${i.nombre}${i.norma ? ` | ${i.norma}` : ''}`)].join('\n')
      ).join('\n\n')
    }
    case 'herramientasYEquipos': {
      const v = (valor as PlanHerramientasYEquipos | null) ?? { equipos: [], herramientas: [], materiales: [] }
      return HERR_GRUPOS.map(([k, t]) =>
        [t, ...(v[k] ?? []).map((i) => {
          const cant = i.cantidad != null ? `${fmtNum(i.cantidad)}${i.unidad ? ` ${i.unidad}` : ''}` : (i.unidad ?? '')
          const partes = [i.nombre, cant, i.observaciones ?? ''].map((p) => p.trim())
          while (partes.length > 1 && !partes[partes.length - 1]) partes.pop()
          return `- ${partes.join(' | ')}`
        })].join('\n')
      ).join('\n\n')
    }
    case 'personalAsignado':
      return ((valor as PlanPersonal[] | null) ?? [])
        .map((p) => `- ${p.nombre} — ${p.cargo}${p.empresa ? ` (${p.empresa})` : ''}${p.telefono ? ` · ${p.telefono}` : ''}`).join('\n')
    case 'matrizRaci':
      return ((valor as PlanRaci | null)?.filas ?? [])
        .map((f) => `- ${f.edt}: ${f.asignaciones.map((a) => `${a.siglas}=${a.rol}`).join(', ')}`).join('\n')
    case 'histogramas': {
      const h = valor as PlanHistogramas | null
      if (!h) return ''
      const bloque = (titulo: string, filas: { etiqueta: string; total: number }[], unidad: string) =>
        filas.length ? [titulo, ...filas.map((f) => `- ${f.etiqueta}: ${fmtNum(f.total)} ${unidad}`)].join('\n') : ''
      return [
        h.meses?.length ? `Meses: ${h.meses.join(', ')}` : '',
        bloque('EQUIPO DE TRABAJO', h.equipoTrabajo ?? [], 'pers-mes'),
        bloque('HORAS-HOMBRE', h.horasHombre ?? [], 'HH'),
      ].filter(Boolean).join('\n\n')
    }
    case 'cronogramaResumen':
      return ((valor as PlanCronograma | null)?.filas ?? [])
        .map((f) => `- ${f.fase} / ${f.edt}${f.actividad ? ` / ${f.actividad}` : ''}: ${fmtFecha(f.fechaInicio)} – ${fmtFecha(f.fechaFin)} · ${fmtNum(f.horasPlan)} h`).join('\n')
    case 'referencias':
      return ((valor as PlanReferencia[] | null) ?? [])
        .map((r) => `- ${r.codigoDocumento ? `${r.codigoDocumento} — ` : ''}${r.titulo}`).join('\n')
    case 'alcanceDetallado':
      return ((valor as PlanAlcanceDetalladoEdt[] | null) ?? []).map(edtATexto).join('\n\n')
    default:
      return ''
  }
}

/** Un EDT del Alcance Detallado como texto: descripción, actividades y viñetas (sin las excluidas). */
export function edtATexto(edt: PlanAlcanceDetalladoEdt): string {
  const lineas = [`${edt.numeracion} ${edt.edtNombre}${edt.ubicacion ? ` (${edt.ubicacion})` : ''}`, edt.descripcion]
  for (const s of edt.subItems ?? []) {
    lineas.push('', `${s.numeracion} ${s.actividadNombre}`, s.descripcion)
    for (const t of (s.tareas ?? []).filter((t) => !t.excluida)) lineas.push(`- ${t.texto || t.nombre}`)
  }
  return lineas.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim()
}

// ─── Desde texto (al pegar) ─────────────────────────────────────────────────

export interface ResultadoTexto<T> {
  valor?: T
  error?: string
  /** Resumen para la vista previa ("12 ítems en 3 grupos"). */
  resumen: string
}

function porGrupos(texto: string, grupos: [string, string][]): { grupos: Map<string, string[]>; error?: string } {
  const titulos = new Map(grupos.map(([k, t]) => [norm(t), k]))
  const r = new Map(grupos.map(([k]) => [k, [] as string[]]))
  let actual: string | null = null
  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim()
    if (!l) continue
    const k = titulos.get(norm(l.replace(/:$/, '')))
    if (k) { actual = k; continue }
    if (!actual) return { grupos: r, error: `"${l.slice(0, 40)}" está antes de un título de grupo (${grupos.map(([, t]) => t).join(', ')}).` }
    const item = sinVineta(l)
    if (item) r.get(actual)!.push(item)
  }
  return { grupos: r }
}

export function textoASeccion(seccion: SeccionRegenerable, texto: string, anterior: unknown): ResultadoTexto<unknown> {
  const limpio = texto.replace(/\r\n/g, '\n').trim()
  switch (seccion) {
    case 'objetivo':
    case 'alcanceGeneral':
      if (!limpio) return { error: 'El texto está vacío.', resumen: '' }
      if (limpio.length > 20000) return { error: 'El texto pasa de 20 000 caracteres.', resumen: '' }
      return { valor: limpio, resumen: `${limpio.length} caracteres` }

    case 'restricciones': {
      const previas = new Map(((anterior as PlanRestriccion[] | null) ?? []).map((r) => [norm(r.texto), r]))
      const items = limpio.split('\n').map(sinVineta).filter(Boolean)
      if (!items.length) return { error: 'No hay ninguna restricción.', resumen: '' }
      const valor: PlanRestriccion[] = items.map((t) => {
        const prev = previas.get(norm(t))
        return prev?.categoria ? { texto: t, categoria: prev.categoria } : { texto: t }
      })
      return { valor, resumen: `${valor.length} restricción(es)` }
    }

    case 'eppRequeridos': {
      const { grupos, error } = porGrupos(limpio, EPP_GRUPOS)
      if (error) return { error, resumen: '' }
      const prev = (anterior as PlanEPP | null) ?? { basico: [], bioseguridad: [], riesgoEspecifico: [] }
      const valor = {} as PlanEPP
      for (const [k] of EPP_GRUPOS) {
        const previos = new Map((prev[k] ?? []).map((i) => [norm(i.nombre), i]))
        valor[k] = grupos.get(k)!.map((linea): PlanEPPItem => {
          const [nombre, norma] = linea.split('|').map((p) => p.trim())
          const p = previos.get(norm(nombre))
          return {
            nombre,
            ...(norma ? { norma } : {}),
            ...(p?.observaciones ? { observaciones: p.observaciones } : {}),
            ...(p?.grupo ? { grupo: p.grupo } : {}),
          }
        }).filter((i) => i.nombre)
      }
      const total = EPP_GRUPOS.reduce((s, [k]) => s + valor[k].length, 0)
      if (!total) return { error: 'No hay ningún EPP.', resumen: '' }
      return { valor, resumen: EPP_GRUPOS.map(([k, t]) => `${t.toLowerCase()} ${valor[k].length}`).join(' · ') }
    }

    case 'herramientasYEquipos': {
      const { grupos, error } = porGrupos(limpio, HERR_GRUPOS)
      if (error) return { error, resumen: '' }
      const valor = {} as PlanHerramientasYEquipos
      for (const [k] of HERR_GRUPOS) {
        valor[k] = grupos.get(k)!.map((linea): PlanItemRecurso => {
          const [nombre, cant, ...obs] = linea.split('|').map((p) => p.trim())
          const m = cant ? /^(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(cant) : null
          return {
            nombre,
            ...(m ? { cantidad: Number(m[1].replace(',', '.')) } : {}),
            ...(m && m[2] ? { unidad: m[2] } : !m && cant ? { unidad: cant } : {}),
            ...(obs.join(' | ') ? { observaciones: obs.join(' | ') } : {}),
          }
        }).filter((i) => i.nombre)
      }
      const total = HERR_GRUPOS.reduce((s, [k]) => s + valor[k].length, 0)
      if (!total) return { error: 'No hay ningún ítem.', resumen: '' }
      return { valor, resumen: HERR_GRUPOS.map(([k, t]) => `${t.toLowerCase()} ${valor[k].length}`).join(' · ') }
    }

    default:
      return { error: 'Esta sección solo se puede copiar.', resumen: '' }
  }
}
