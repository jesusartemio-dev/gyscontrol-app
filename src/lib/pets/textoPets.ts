// PETS como TEXTO para ida y vuelta con una IA (Claude, ChatGPT…), por partes:
// una etapa, un paso, todo el procedimiento o una sección simple (personal,
// EPP, recursos, restricciones). El "CÓMO" de cada paso va como Markdown
// sencillo, que las IAs respetan:
//
//   ETAPA A: Preparación del área
//
//   PASO 1: Delimitar la zona de trabajo
//   QUIÉN: Supervisor de campo, Técnico electricista
//   CÓMO:
//   Párrafo normal.
//   Verificar antes de iniciar:          ← línea con ":" pegada a la lista = título
//   - item
//   ### Subsección                        ← "####" para una dentro de otra
//   | Columna | Columna |                 ← tabla
//   [Ilustración 3: Señalización]
//   [Ver: PETAR-001 — Permiso de trabajo de alto riesgo (nota)]
//   PROHIBIDO: Título opcional
//   - prohibición
//   [fin de subsección: Título]           ← cierra esa subsección (solo si sigue texto fuera de ella)

import type { BloqueComo, PetsContenido } from '@/lib/validators/pets'

type Etapa = PetsContenido['procedimiento']['etapas'][number]
type Paso = Etapa['pasos'][number]

export interface Interpretado<T> {
  valor?: T
  errores: string[]
  resumen: string
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
/** Quita negritas/cursivas de Markdown que suelen agregar las IAs. */
const sinMarcas = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/^\*\*|\*\*$/g, '')

export const INSTRUCCIONES_PETS = `INSTRUCCIONES PARA LA IA
Eres especialista en seguridad y salud ocupacional (PETS, D.S. 024-2016-EM, Perú).
Revisa y mejora este texto del PETS (Procedimiento Escrito de Trabajo Seguro):
pasos claros y en orden, responsables correctos, controles y prohibiciones
concretos para el trabajo descrito.
Reglas de formato (una aplicación lee tu respuesta automáticamente):
1. Mantén los encabezados tal cual: "ETAPA <letra>: …", "PASO <n>: …",
   "QUIÉN: …" (roles separados por coma) y "CÓMO:".
2. Dentro de CÓMO: párrafos normales; listas con "- "; una línea terminada en
   ":" pegada a una lista es su título; subsecciones con "### Título" ("####"
   para una dentro de otra; si después sigue texto fuera de ella, cierra con
   "[fin de subsección: Título]"); tablas Markdown con "|"; ilustraciones como
   "[Ilustración <n>: título]"; referencias como "[Ver: CÓDIGO — Documento]";
   prohibiciones con una línea "PROHIBIDO:" seguida de "- " por cada una.
3. En las listas simples (personal, EPP, recursos, restricciones): un elemento
   por línea con "- " y los mismos títulos de grupo.
4. Texto plano: sin negritas ni JSON. Devuelve solo el texto del PETS.
=== FIN DE INSTRUCCIONES ===`

/** Descarta las instrucciones si vinieron pegadas de vuelta. */
function sinInstrucciones(texto: string): string[] {
  const lineas = texto.replace(/\r\n?/g, '\n').replace(/ /g, ' ').split('\n')
  const fin = lineas.findIndex((l) => /^=+\s*FIN DE INSTRUCCIONES/i.test(l.trim()))
  return fin >= 0 ? lineas.slice(fin + 1) : lineas
}

// ─── CÓMO (bloques) ─────────────────────────────────────────────────────────

export function comoATexto(bloques: BloqueComo[], nivel = 1): string[] {
  const out: string[] = []
  bloques.forEach((b, i) => {
    switch (b.tipo) {
      case 'parrafo':
        out.push(b.texto, '')
        break
      case 'lista':
        if (b.titulo) out.push(/:\s*$/.test(b.titulo) ? b.titulo : `${b.titulo}:`)
        out.push(...b.items.map((x) => `- ${x}`), '')
        break
      case 'subseccion': {
        out.push(`${'#'.repeat(2 + nivel)} ${b.titulo}`, ...comoATexto(b.bloques, nivel + 1))
        // Si sigue algo que NO es otra subsección, hay que decir dónde termina
        // ésta (con su nombre: cierra también las que tenga adentro).
        const sig = bloques[i + 1]
        if (sig && sig.tipo !== 'subseccion') out.push(`[fin de subsección: ${b.titulo}]`, '')
        break
      }
      case 'tabla':
        if (b.titulo) out.push(/:\s*$/.test(b.titulo) ? b.titulo : `${b.titulo}:`)
        out.push(`| ${b.headers.join(' | ')} |`, `|${b.headers.map(() => '---').join('|')}|`)
        out.push(...b.filas.map((f) => `| ${f.join(' | ')} |`), '')
        break
      case 'ilustracion':
        out.push(`[Ilustración ${b.numero}: ${b.titulo}]`, '')
        break
      case 'referencia':
        out.push(`[Ver: ${b.codigo} — ${b.documento}${b.nota ? ` (${b.nota})` : ''}]`, '')
        break
      case 'restriccion':
        out.push(`PROHIBIDO:${b.titulo ? ` ${b.titulo}` : ''}`, ...b.prohibiciones.map((x) => `- ${x}`), '')
        break
    }
  })
  return out
}

function textoAComo(lineas: string[], ref: string, errores: string[]): BloqueComo[] {
  const raiz: BloqueComo[] = []
  const pila: { nivel: number; bloques: BloqueComo[]; titulo: string }[] = [{ nivel: 0, bloques: raiz, titulo: '' }]
  let parrafo: string[] = []
  let lista: { tipo: 'lista' | 'restriccion'; titulo?: string; items: string[] } | null = null
  let tabla: { titulo?: string; filas: string[][] } | null = null
  const destino = () => pila[pila.length - 1].bloques

  const cerrarParrafo = () => {
    if (parrafo.length) destino().push({ tipo: 'parrafo', texto: parrafo.join(' ') })
    parrafo = []
  }
  const cerrarLista = () => {
    if (lista) {
      if (lista.tipo === 'restriccion') {
        if (lista.items.length) destino().push({ tipo: 'restriccion', ...(lista.titulo ? { titulo: lista.titulo } : {}), prohibiciones: lista.items })
        else errores.push(`${ref}: "PROHIBIDO" sin ninguna prohibición debajo ("- …")`)
      } else if (lista.items.length) {
        destino().push({ tipo: 'lista', ...(lista.titulo ? { titulo: lista.titulo } : {}), items: lista.items })
      }
    }
    lista = null
  }
  const cerrarTabla = () => {
    if (tabla && tabla.filas.length) {
      const [headers, ...filas] = tabla.filas
      destino().push({ tipo: 'tabla', ...(tabla.titulo ? { titulo: tabla.titulo } : {}), headers, filas })
    }
    tabla = null
  }
  const cerrarTodo = () => { cerrarParrafo(); cerrarLista(); cerrarTabla() }
  /** Un párrafo de una sola línea terminado en ":" pegado a una lista/tabla es su título. */
  const tomarTitulo = (): string | undefined => {
    if (parrafo.length === 1 && /:\s*$/.test(parrafo[0])) {
      const t = parrafo[0].replace(/:\s*$/, '').trim()
      parrafo = []
      return t
    }
    cerrarParrafo()
    return undefined
  }
  const cerrarSubsecciones = (hasta: number) => {
    while (pila.length > 1 && pila[pila.length - 1].nivel >= hasta) {
      const s = pila.pop()!
      if (s.bloques.length === 0) errores.push(`${ref}: la subsección "${s.titulo}" quedó vacía`)
    }
  }

  for (const cruda of lineas) {
    const t = sinMarcas(cruda.trim())
    if (!t) { cerrarTodo(); continue }

    let m: RegExpExecArray | null
    if ((m = /^(#{3,6})\s+(.+)$/.exec(t))) {
      cerrarTodo()
      const nivel = m[1].length - 2
      cerrarSubsecciones(nivel)
      const sub: BloqueComo = { tipo: 'subseccion', titulo: m[2].trim(), bloques: [] }
      destino().push(sub)
      pila.push({ nivel, bloques: (sub as { bloques: BloqueComo[] }).bloques, titulo: m[2].trim() })
      continue
    }
    if ((m = /^\[\s*fin( de)? subsecci[oó]n(?:\s*:\s*(.+?))?\s*\]$/i.exec(t))) {
      cerrarTodo()
      // Con nombre: cierra esa subsección (y las de adentro). Sin nombre: la última.
      const nombre = m[2] ? norm(m[2]) : null
      const idx = nombre ? pila.findIndex((p, k) => k > 0 && norm(p.titulo) === nombre) : -1
      if (idx > 0) cerrarSubsecciones(pila[idx].nivel)
      else if (pila.length > 1) cerrarSubsecciones(pila[pila.length - 1].nivel)
      continue
    }
    if ((m = /^\[\s*ilustraci[oó]n\s+(\d+)\s*[:.-]\s*(.+?)\s*\]$/i.exec(t))) {
      cerrarTodo()
      destino().push({ tipo: 'ilustracion', numero: Number(m[1]), titulo: m[2] })
      continue
    }
    if ((m = /^\[\s*(?:ver|ref|referencia)\s*:\s*(.+?)\s*\]$/i.exec(t))) {
      cerrarTodo()
      const r = /^(.+?)\s+[—–-]\s+(.+?)(?:\s*\(([^()]*)\))?$/.exec(m[1])
      if (r) destino().push({ tipo: 'referencia', codigo: r[1].trim(), documento: r[2].trim(), ...(r[3] ? { nota: r[3].trim() } : {}) })
      else errores.push(`${ref}: referencia "${t}" debe ser "[Ver: CÓDIGO — Documento]"`)
      continue
    }
    if ((m = /^PROHIBID[OA]S?\b\s*:?\s*(.*)$/i.exec(t))) {
      cerrarTodo()
      lista = { tipo: 'restriccion', titulo: m[1].trim() || undefined, items: [] }
      continue
    }
    if (/^\|.*\|$/.test(t)) {
      cerrarLista()
      if (!tabla) tabla = { titulo: tomarTitulo(), filas: [] }
      if (/^\|[\s:|-]+\|$/.test(t)) continue // fila separadora
      tabla.filas.push(t.slice(1, -1).split('|').map((c) => c.trim()))
      continue
    }
    if ((m = /^(?:[-•*·✗]|\d+[.)])\s+(.+)$/.exec(t))) {
      cerrarTabla()
      if (!lista) lista = { tipo: 'lista', titulo: tomarTitulo(), items: [] }
      lista.items.push(m[1].trim())
      continue
    }
    cerrarLista(); cerrarTabla()
    parrafo.push(t)
  }
  cerrarTodo()
  cerrarSubsecciones(1)
  return raiz
}

// ─── Pasos y etapas ─────────────────────────────────────────────────────────

const letraDe = (e: Etapa, i: number) => e.letra ?? String.fromCharCode(65 + i)

export function pasoATexto(p: Paso, n: number): string {
  return [
    `PASO ${n}: ${p.que}`,
    `QUIÉN: ${p.quien.map((q) => q.rol).join(', ')}`,
    'CÓMO:',
    ...comoATexto(p.como),
  ].join('\n').trimEnd()
}

export function etapaATexto(e: Etapa, i: number): string {
  return [`ETAPA ${letraDe(e, i)}: ${e.titulo}`, '', ...e.pasos.map((p, j) => pasoATexto(p, j + 1) + '\n')].join('\n').trimEnd()
}

export function procedimientoATexto(c: PetsContenido): string {
  return c.procedimiento.etapas.map(etapaATexto).join('\n\n')
}

const RE_ETAPA = /^ETAPA\s+([A-Za-z]|\d{1,2})?\s*[:.—–-]\s*(.+)$/i
const RE_PASO = /^PASO\s*(\d+)?\s*[:.—–-]\s*(.+)$/i
const RE_QUIEN = /^QUI[EÉ]N(?:ES)?\s*:\s*(.+)$/i
const RE_COMO = /^C[OÓ]MO\s*:?\s*(.*)$/i

interface PasoCrudo { que: string; quien: string | null; cuerpo: string[]; linea: number }
interface EtapaCruda { letra?: string; titulo: string; pasos: PasoCrudo[]; linea: number }

function partirEtapas(lineas: string[]): { etapas: EtapaCruda[]; sueltos: PasoCrudo[] } {
  const etapas: EtapaCruda[] = []
  const sueltos: PasoCrudo[] = [] // pasos antes de cualquier ETAPA (modo "un paso")
  let etapa: EtapaCruda | null = null
  let paso: PasoCrudo | null = null
  lineas.forEach((cruda, i) => {
    const t = sinMarcas(cruda.trim()).replace(/^#{1,2}\s+/, '')
    let m: RegExpExecArray | null
    if ((m = RE_ETAPA.exec(t))) {
      // "ETAPA 2:" (número) → sin letra: se usa la de su posición.
      etapa = { letra: m[1] && /[a-z]/i.test(m[1]) ? m[1].toUpperCase() : undefined, titulo: m[2].trim(), pasos: [], linea: i + 1 }
      etapas.push(etapa)
      paso = null
      return
    }
    if ((m = RE_PASO.exec(t))) {
      paso = { que: m[2].trim(), quien: null, cuerpo: [], linea: i + 1 }
      ;(etapa ? (etapa as EtapaCruda).pasos : sueltos).push(paso)
      return
    }
    if (!paso) return // texto antes del primer PASO (títulos, comentarios)
    const p = paso as PasoCrudo
    if (p.quien === null && (m = RE_QUIEN.exec(t))) { p.quien = m[1].trim(); return }
    if ((m = RE_COMO.exec(t)) && p.cuerpo.every((l) => !l.trim())) {
      if (m[1].trim()) p.cuerpo.push(m[1].trim())
      return
    }
    p.cuerpo.push(cruda)
  })
  return { etapas, sueltos }
}

function construirPaso(c: PasoCrudo, n: number, errores: string[]): Paso | null {
  const ref = `PASO ${n} (línea ${c.linea})`
  const roles = (c.quien ?? '').split(/[,;]|\s+y\s+/).map((r) => r.trim()).filter(Boolean)
  const como = textoAComo(c.cuerpo, ref, errores)
  let ok = true
  if (c.que.length < 3) { errores.push(`${ref}: el "qué" es muy corto`); ok = false }
  if (!roles.length) { errores.push(`${ref}: falta la línea "QUIÉN: …"`); ok = false }
  if (!como.length) { errores.push(`${ref}: el "CÓMO" está vacío`); ok = false }
  return ok ? { numero: n, que: c.que, quien: roles.map((rol) => ({ rol })), como } : null
}

/** Un paso suelto (sin ETAPA). */
export function textoAPaso(texto: string): Interpretado<Paso> {
  const errores: string[] = []
  const { etapas, sueltos } = partirEtapas(sinInstrucciones(texto))
  const pasos = sueltos.length ? sueltos : etapas.flatMap((e) => e.pasos)
  if (pasos.length !== 1) {
    return { errores: [pasos.length ? `Vinieron ${pasos.length} pasos: acá va uno solo (para varios, editá la etapa)` : 'No encontré "PASO …:"'], resumen: '' }
  }
  const p = construirPaso(pasos[0], 1, errores)
  return p && !errores.length
    ? { valor: p, errores, resumen: `${p.como.length} bloque(s) en el CÓMO · ${p.quien.length} responsable(s)` }
    : { errores, resumen: '' }
}

function construirEtapa(e: EtapaCruda, errores: string[]): Etapa | null {
  if (e.titulo.length < 3) errores.push(`ETAPA (línea ${e.linea}): título muy corto`)
  if (!e.pasos.length) { errores.push(`ETAPA "${e.titulo}": no tiene ningún PASO`); return null }
  const pasos = e.pasos.map((p, j) => construirPaso(p, j + 1, errores)).filter((p): p is Paso => !!p)
  return { ...(e.letra ? { letra: e.letra } : {}), titulo: e.titulo, pasos }
}

/** Una etapa. Si el texto no trae "ETAPA …:", se conserva el título actual. */
export function textoAEtapa(texto: string, actual: Etapa): Interpretado<Etapa> {
  const errores: string[] = []
  const { etapas, sueltos } = partirEtapas(sinInstrucciones(texto))
  if (etapas.length > 1) return { errores: [`Vinieron ${etapas.length} etapas: acá va una sola (para varias, editá el procedimiento completo)`], resumen: '' }
  const cruda: EtapaCruda = etapas[0] ?? { letra: actual.letra, titulo: actual.titulo, pasos: sueltos, linea: 1 }
  if (!etapas[0] && !sueltos.length) return { errores: ['No encontré ningún "PASO …:"'], resumen: '' }
  if (etapas[0] && sueltos.length) errores.push(`Hay ${sueltos.length} paso(s) antes de "ETAPA": se ignoran`)
  const e = construirEtapa({ ...cruda, letra: cruda.letra ?? actual.letra }, errores)
  return e && !errores.length
    ? { valor: e, errores, resumen: `"${e.titulo}" · ${e.pasos.length} paso(s) (antes ${actual.pasos.length})` }
    : { errores, resumen: '' }
}

/** Todo el procedimiento (1 a 12 etapas). */
export function textoAProcedimiento(texto: string, actual: PetsContenido): Interpretado<Etapa[]> {
  const errores: string[] = []
  const { etapas, sueltos } = partirEtapas(sinInstrucciones(texto))
  if (!etapas.length) return { errores: ['No encontré ninguna "ETAPA …:"'], resumen: '' }
  if (etapas.length > 12) errores.push(`Son ${etapas.length} etapas: el máximo es 12`)
  if (sueltos.length) errores.push(`Hay ${sueltos.length} paso(s) antes de la primera ETAPA: se ignoran`)
  const res = etapas.map((e) => construirEtapa(e, errores)).filter((e): e is Etapa => !!e)
  const pasos = res.reduce((s, e) => s + e.pasos.length, 0)
  const antes = actual.procedimiento.etapas.reduce((s, e) => s + e.pasos.length, 0)
  return !errores.length
    ? { valor: res, errores, resumen: `${res.length} etapa(s), ${pasos} paso(s) (antes ${actual.procedimiento.etapas.length} etapas, ${antes} pasos)` }
    : { errores, resumen: '' }
}

// ─── Secciones simples ──────────────────────────────────────────────────────

export type SeccionSimple = 'personal' | 'epp' | 'recursos' | 'restricciones'

const GRUPOS = {
  epp: [['basico', 'BÁSICO'], ['bioseguridad', 'BIOSEGURIDAD'], ['especifico', 'ESPECÍFICO']],
  recursos: [['equipos', 'EQUIPOS'], ['herramientas', 'HERRAMIENTAS'], ['materiales', 'MATERIALES']],
} as const

export function seccionATexto(s: SeccionSimple, c: PetsContenido): string {
  switch (s) {
    case 'personal': return c.personal.map((p) => `- ${p.rol}`).join('\n')
    case 'restricciones': return c.restricciones.map((r) => `- ${r.texto}`).join('\n')
    case 'epp':
      return [
        ...GRUPOS.epp.map(([k, t]) => [t, ...c.epp[k].map((x) => `- ${x.nombre}`)].join('\n')),
        `Referencia MPP: ${c.epp.mppRef}`,
      ].join('\n\n')
    case 'recursos':
      return GRUPOS.recursos.map(([k, t]) => [t, ...c.recursos[k].map((x) => `- ${x.nombre}`)].join('\n')).join('\n\n')
  }
}

const item = (l: string) => sinMarcas(l.trim()).replace(/^(?:[-•*·✗]|\d+[.)])\s+/, '').trim()

export function textoASeccion(s: SeccionSimple, texto: string, c: PetsContenido): Interpretado<Partial<PetsContenido>> {
  const lineas = sinInstrucciones(texto).map((l) => l.trim()).filter(Boolean)
  if (s === 'personal' || s === 'restricciones') {
    const items = lineas.map(item).filter(Boolean)
    if (!items.length) return { errores: ['No hay ningún elemento ("- …")'], resumen: '' }
    return s === 'personal'
      ? { valor: { personal: items.map((rol) => ({ rol })) }, errores: [], resumen: `${items.length} rol(es)` }
      : { valor: { restricciones: items.map((t) => ({ texto: t })) }, errores: [], resumen: `${items.length} restricción(es)` }
  }
  const grupos = GRUPOS[s]
  const titulos = new Map<string, string>(grupos.map(([k, t]) => [norm(t), k]))
  const out = Object.fromEntries(grupos.map(([k]) => [k, [] as { nombre: string }[]])) as Record<string, { nombre: string }[]>
  let actual: string | null = null
  let mppRef = s === 'epp' ? c.epp.mppRef : ''
  const errores: string[] = []
  for (const l of lineas) {
    const limpio = sinMarcas(l).replace(/:$/, '').replace(/^#+\s*/, '')
    const k = titulos.get(norm(limpio))
    if (k) { actual = k; continue }
    const mpp = /^referencia\s+mpp\s*:\s*(.+)$/i.exec(sinMarcas(l))
    if (s === 'epp' && mpp) { mppRef = mpp[1].trim(); continue }
    if (!actual) { errores.push(`"${l.slice(0, 40)}" está antes de un título de grupo (${grupos.map(([, t]) => t).join(', ')})`); continue }
    const n = item(l)
    if (n) out[actual].push({ nombre: n })
  }
  if (errores.length) return { errores, resumen: '' }
  const resumen = grupos.map(([k, t]) => `${t.toLowerCase()} ${out[k].length}`).join(' · ')
  return s === 'epp'
    ? { valor: { epp: { basico: out.basico, bioseguridad: out.bioseguridad, especifico: out.especifico, mppRef } }, errores, resumen }
    : { valor: { recursos: { equipos: out.equipos, herramientas: out.herramientas, materiales: out.materiales } }, errores, resumen }
}
