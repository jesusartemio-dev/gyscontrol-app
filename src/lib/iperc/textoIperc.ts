// IPERC como TEXTO para ida y vuelta con una IA (Claude, ChatGPT…): se copia
// un grupo de filas, la IA las mejora y se pega de vuelta. Formato "fichas":
// un bloque por fila con etiquetas fijas, que la IA respeta y que se lee en el
// celular (una tabla de 20 columnas la IA la desarma y no se lee).
//
//   FILA 12 · id:k3f9ab12
//   Tarea: …
//   Peligro: …
//   Severidad: 4
//   …
//   ---
//
// Reglas al pegar:
//  - Cada bloque se asocia a su fila por el id (o por el número si no hay id).
//  - "FILA nueva" crea una fila; lo que no traiga (proceso, actividad, tarea…)
//    lo hereda de la fila anterior del texto.
//  - Nunca se borra nada: las filas que no vienen en el texto quedan igual.
//  - Etiqueta ausente = ese dato no cambia. Todo se valida antes de guardar.

import { evaluarRiesgo } from '@/lib/iperc/catalogos/matrizRiesgo'

export interface FilaIpercTexto {
  id: string
  numero: number
  proceso: string
  actividad: string
  tarea: string
  puestoTrabajo: string
  factorRiesgo: string
  condicionActividad: string
  peligro: string
  riesgo: string
  consecuencia: string
  severidad: number
  probabilidad: string
  eliminar: string
  sustituir: string
  controlIngenieria: string
  controlAdministrativo: string
  controlReceptor: string
  severidadResidual: number
  probabilidadResidual: string
  accionesMejora: string
  responsables: string
  tareaCronogramaRefId?: string | null
  actividadCronogramaRefId?: string | null
}

export type CampoIperc = Exclude<keyof FilaIpercTexto, 'id' | 'numero' | 'tareaCronogramaRefId' | 'actividadCronogramaRefId'>

export const FACTORES_RIESGO = [
  'MECÁNICO', 'LOCATIVO', 'ELÉCTRICO', 'FÍSICO', 'QUÍMICO',
  'ERGONÓMICO', 'PSICOSOCIAL', 'BIOLÓGICO', 'FISICOQUÍMICO',
] as const

/** Etiquetas en el orden del texto (y nombre corto para el resumen de cambios). */
export const CAMPOS_IPERC: { campo: CampoIperc; etiqueta: string }[] = [
  { campo: 'proceso', etiqueta: 'Proceso' },
  { campo: 'actividad', etiqueta: 'Actividad' },
  { campo: 'tarea', etiqueta: 'Tarea' },
  { campo: 'puestoTrabajo', etiqueta: 'Puesto' },
  { campo: 'factorRiesgo', etiqueta: 'Factor' },
  { campo: 'condicionActividad', etiqueta: 'Condición' },
  { campo: 'peligro', etiqueta: 'Peligro' },
  { campo: 'riesgo', etiqueta: 'Riesgo' },
  { campo: 'consecuencia', etiqueta: 'Consecuencia' },
  { campo: 'severidad', etiqueta: 'Severidad' },
  { campo: 'probabilidad', etiqueta: 'Probabilidad' },
  { campo: 'eliminar', etiqueta: 'Eliminar' },
  { campo: 'sustituir', etiqueta: 'Sustituir' },
  { campo: 'controlIngenieria', etiqueta: 'Ingeniería' },
  { campo: 'controlAdministrativo', etiqueta: 'Administrativo' },
  { campo: 'controlReceptor', etiqueta: 'EPP' },
  { campo: 'severidadResidual', etiqueta: 'Severidad residual' },
  { campo: 'probabilidadResidual', etiqueta: 'Probabilidad residual' },
  { campo: 'accionesMejora', etiqueta: 'Acciones de mejora' },
  { campo: 'responsables', etiqueta: 'Responsables' },
]

const ETIQUETA_DE = Object.fromEntries(CAMPOS_IPERC.map((c) => [c.campo, c.etiqueta])) as Record<CampoIperc, string>
export const etiquetaCampo = (c: CampoIperc) => ETIQUETA_DE[c]

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Sinónimos que suelen usar las IAs para cada etiqueta (ya normalizados). */
const ALIAS: Record<string, CampoIperc> = {
  proceso: 'proceso',
  actividad: 'actividad',
  tarea: 'tarea',
  puesto: 'puestoTrabajo', 'puesto de trabajo': 'puestoTrabajo',
  factor: 'factorRiesgo', 'factor de riesgo': 'factorRiesgo',
  condicion: 'condicionActividad', 'condicion de la actividad': 'condicionActividad', 'condicion de actividad': 'condicionActividad',
  peligro: 'peligro',
  riesgo: 'riesgo',
  consecuencia: 'consecuencia', consecuencias: 'consecuencia',
  severidad: 'severidad',
  probabilidad: 'probabilidad',
  eliminar: 'eliminar', eliminacion: 'eliminar',
  sustituir: 'sustituir', sustitucion: 'sustituir',
  ingenieria: 'controlIngenieria', 'control de ingenieria': 'controlIngenieria', 'controles de ingenieria': 'controlIngenieria',
  administrativo: 'controlAdministrativo', 'control administrativo': 'controlAdministrativo', 'controles administrativos': 'controlAdministrativo',
  epp: 'controlReceptor', 'epp (receptor)': 'controlReceptor', receptor: 'controlReceptor', 'control receptor': 'controlReceptor', 'control en el receptor': 'controlReceptor',
  'severidad residual': 'severidadResidual',
  'probabilidad residual': 'probabilidadResidual',
  'acciones de mejora': 'accionesMejora', acciones: 'accionesMejora', 'plan de mejora': 'accionesMejora',
  responsables: 'responsables', responsable: 'responsables',
}

const CAMPOS_NUMERO: CampoIperc[] = ['severidad', 'severidadResidual']
const CAMPOS_PROB: CampoIperc[] = ['probabilidad', 'probabilidadResidual']
/** Obligatorios con contenido (los controles pueden ir vacíos o "NA"). */
const OBLIGATORIOS: CampoIperc[] = [
  'proceso', 'actividad', 'tarea', 'puestoTrabajo', 'factorRiesgo', 'condicionActividad',
  'peligro', 'riesgo', 'consecuencia', 'severidad', 'probabilidad', 'severidadResidual', 'probabilidadResidual',
]

/** Id corto que va en el texto (los últimos 8 caracteres del id). */
export const idCorto = (id: string) => id.slice(-8)

// ─── A texto ────────────────────────────────────────────────────────────────

export const INSTRUCCIONES_IA = `INSTRUCCIONES PARA LA IA
Eres especialista en seguridad y salud ocupacional (IPERC, D.S. 024-2016-EM, Perú).
Revisa y mejora estas filas del IPERC: peligros, riesgos, consecuencias, controles
(jerarquía: eliminar → sustituir → ingeniería → administrativo → EPP) y la
valoración residual, coherente con los controles.
Reglas de formato (una aplicación lee tu respuesta automáticamente):
1. Devuelve las filas en EXACTAMENTE este formato: un bloque por fila que empieza
   con la línea "FILA <n> · id:<código>" (cópiala igual) y termina con "---".
2. Usa las mismas etiquetas, una por línea ("Peligro: …"). Texto plano: sin tablas,
   sin JSON, sin negritas.
3. Para agregar una fila nueva empieza el bloque con "FILA nueva".
4. No elimines filas. Si alguna sobra, déjala igual y avísalo DESPUÉS del último "---".
5. Severidad: 1=Catastrófica, 2=Mortal, 3=Permanente, 4=Temporal, 5=Menor.
   Probabilidad: A=Común, B=Ha sucedido, C=Podría suceder, D=Raro, E=Prácticamente imposible.
6. Factor: ${FACTORES_RIESGO.join(', ')}. Condición: Rutinaria o No rutinaria.
=== FIN DE INSTRUCCIONES ===`

export function filaATexto(f: FilaIpercTexto): string {
  const lineas = [`FILA ${f.numero} · id:${idCorto(f.id)}`]
  for (const { campo, etiqueta } of CAMPOS_IPERC) {
    const v = f[campo]
    lineas.push(`${etiqueta}: ${v === '' || v == null ? '-' : String(v).replace(/\s*\n\s*/g, ' ')}`)
  }
  lineas.push('---')
  return lineas.join('\n')
}

export function filasATexto(filas: FilaIpercTexto[], opciones: { titulo?: string; instrucciones?: boolean } = {}): string {
  const partes: string[] = []
  if (opciones.instrucciones) partes.push(INSTRUCCIONES_IA)
  if (opciones.titulo) partes.push(`IPERC — ${opciones.titulo} (${filas.length} fila${filas.length === 1 ? '' : 's'})`)
  partes.push(filas.map(filaATexto).join('\n\n'))
  return partes.join('\n\n')
}

// ─── Desde texto ────────────────────────────────────────────────────────────

type DatosFila = Omit<FilaIpercTexto, 'id' | 'numero'>

export interface CambioFila {
  id: string
  numero: number
  /** Solo los campos que cambian. */
  cambios: Partial<DatosFila>
  campos: CampoIperc[]
  antes: FilaIpercTexto
}

export interface FilaNueva {
  datos: DatosFila
  /** Fila existente detrás de la cual va (la anterior en el texto); null = al final del grupo. */
  despuesDeId: string | null
}

export interface ResultadoPegado {
  cambiadas: CambioFila[]
  nuevas: FilaNueva[]
  sinCambios: number
  errores: string[]
  avisos: string[]
  /** Bloques FILA encontrados en el texto. */
  bloques: number
  /** Ids de las filas existentes que vinieron en el texto (cambien o no). */
  idsVistos: string[]
}

interface Bloque {
  cabecera: string
  numero: number | null
  idCorto: string | null
  nueva: boolean
  valores: Partial<Record<CampoIperc, string>>
  linea: number
}

const RE_CABECERA = /^[\s#*>-]*FILA\s+(nueva|\d+)\b(.*)$/i
const RE_ID = /id\s*[:=]\s*([a-z0-9]{4,})/i
const RE_ETIQUETA = /^[\s*>•·-]*\**\s*([^:*]{2,45}?)\s*\**\s*:\s*\**\s*(.*)$/

function partirBloques(texto: string): { bloques: Bloque[]; avisos: string[] } {
  const bloques: Bloque[] = []
  const avisos: string[] = []
  let actual: Bloque | null = null
  let ultimo: CampoIperc | null = null
  let cerrado = false // tras "---" o una línea en blanco ya no se continúa el valor

  const lineas = texto.replace(/\r\n?/g, '\n').split('\n')
  lineas.forEach((cruda, i) => {
    const linea = cruda.replace(/ /g, ' ')
    const cab = RE_CABECERA.exec(linea)
    if (cab) {
      const esNueva = cab[1].toLowerCase() === 'nueva'
      const idm = RE_ID.exec(cab[2] ?? '')
      actual = {
        cabecera: linea.trim(),
        numero: esNueva ? null : Number(cab[1]),
        idCorto: idm ? idm[1].toLowerCase() : null,
        nueva: esNueva,
        valores: {},
        linea: i + 1,
      }
      bloques.push(actual)
      ultimo = null
      cerrado = false
      return
    }
    if (!actual) return // instrucciones o texto antes de la primera FILA
    const t = linea.trim()
    if (/^-{3,}$|^={3,}|^_{3,}$/.test(t)) { actual = null; return }
    if (!t) { cerrado = true; return }
    const et = RE_ETIQUETA.exec(linea)
    const campo = et ? ALIAS[norm(et[1])] : undefined
    if (campo) {
      actual.valores[campo] = et![2].replace(/\*+\s*$/, '').trim()
      ultimo = campo
      cerrado = false
      return
    }
    if (ultimo && !cerrado) {
      actual.valores[ultimo] = `${actual.valores[ultimo] ?? ''} ${t}`.trim()
    } else if (!cerrado) {
      avisos.push(`Línea ${i + 1} ignorada (no tiene etiqueta): "${t.slice(0, 50)}"`)
    }
  })
  return { bloques, avisos }
}

const limpiaTexto = (s: string) => s.replace(/\s+/g, ' ').trim()
const vacioANA = (s: string) => (s === '' || s === '-' || /^n\/?a$/i.test(s) ? 'NA' : s)

/** Convierte el valor pegado al tipo del campo; error si no es válido. */
function convertir(campo: CampoIperc, crudo: string): { valor?: string | number; error?: string } {
  const v = limpiaTexto(crudo)
  if (CAMPOS_NUMERO.includes(campo)) {
    const m = /^([1-5])\b/.exec(v)
    return m ? { valor: Number(m[1]) } : { error: `${etiquetaCampo(campo)} debe ser 1 a 5 (vino "${v}")` }
  }
  if (CAMPOS_PROB.includes(campo)) {
    const m = /^([A-Ea-e])\b/.exec(v)
    return m ? { valor: m[1].toUpperCase() } : { error: `${etiquetaCampo(campo)} debe ser A a E (vino "${v}")` }
  }
  if (campo === 'factorRiesgo') {
    const f = FACTORES_RIESGO.find((x) => norm(x) === norm(v))
    return f ? { valor: f } : { error: `Factor "${v}" no es válido (${FACTORES_RIESGO.join(', ')})` }
  }
  if (campo === 'condicionActividad') {
    const n = norm(v)
    if (n === 'rutinaria') return { valor: 'Rutinaria' }
    if (n === 'no rutinaria') return { valor: 'No rutinaria' }
    return { error: `Condición debe ser "Rutinaria" o "No rutinaria" (vino "${v}")` }
  }
  if (campo === 'eliminar' || campo === 'sustituir' || campo === 'accionesMejora') return { valor: vacioANA(v) }
  if (campo === 'controlIngenieria' || campo === 'controlAdministrativo' || campo === 'controlReceptor' || campo === 'responsables') {
    return { valor: v === '-' ? '' : v }
  }
  if (!v || v === '-') return { error: `${etiquetaCampo(campo)} no puede ir vacío` }
  return { valor: v }
}

const igual = (a: unknown, b: unknown) =>
  typeof a === 'number' || typeof b === 'number' ? Number(a) === Number(b) : limpiaTexto(String(a ?? '')) === limpiaTexto(String(b ?? ''))

/**
 * Interpreta el texto pegado contra las filas actuales del IPERC (todas, para
 * poder ubicar cualquier id) y devuelve qué cambiaría — sin guardar nada.
 */
export function textoAFilas(texto: string, filasActuales: FilaIpercTexto[]): ResultadoPegado {
  const { bloques, avisos } = partirBloques(texto)
  const res: ResultadoPegado = { cambiadas: [], nuevas: [], sinCambios: 0, errores: [], avisos, bloques: bloques.length, idsVistos: [] }
  if (bloques.length === 0) {
    res.errores.push('No encontré ningún bloque "FILA …". Pegá el texto con el mismo formato que se copió.')
    return res
  }

  type Previa = { id: string | null; datos: DatosFila }
  const vistas = new Set<string>()
  let anterior: Previa | null = null

  for (const b of bloques) {
    const previa = anterior as Previa | null
    const ref = `"${b.cabecera.slice(0, 40)}" (línea ${b.linea})`
    // Valores convertidos y validados
    const conv: Partial<DatosFila> = {}
    let conError = false
    for (const [campo, crudo] of Object.entries(b.valores) as [CampoIperc, string][]) {
      const r = convertir(campo, crudo)
      if (r.error) { res.errores.push(`${ref}: ${r.error}`); conError = true }
      else (conv as Record<string, unknown>)[campo] = r.valor
    }

    if (b.nueva) {
      // De la fila anterior del texto se hereda solo el CONTEXTO (dónde y
      // quién); peligro, valoración y controles son propios de cada fila.
      const a = previa?.datos
      const base: Partial<DatosFila> = a
        ? {
            proceso: a.proceso, actividad: a.actividad, tarea: a.tarea, puestoTrabajo: a.puestoTrabajo,
            condicionActividad: a.condicionActividad, responsables: a.responsables,
            tareaCronogramaRefId: a.tareaCronogramaRefId, actividadCronogramaRefId: a.actividadCronogramaRefId,
          }
        : {}
      const datos = { ...base, ...conv } as DatosFila
      if (a && datos.tarea !== a.tarea) {
        datos.tareaCronogramaRefId = null
      }
      const faltan = OBLIGATORIOS.filter((c) => datos[c] === undefined || datos[c] === '')
      if (faltan.length) { res.errores.push(`${ref}: faltan ${faltan.map(etiquetaCampo).join(', ')}`); continue }
      if (conError) continue
      for (const c of ['eliminar', 'sustituir', 'accionesMejora'] as const) if (!datos[c]) datos[c] = 'NA'
      for (const c of ['controlIngenieria', 'controlAdministrativo', 'controlReceptor', 'responsables'] as const) if (datos[c] == null) datos[c] = ''
      res.nuevas.push({ datos, despuesDeId: previa?.id ?? null })
      anterior = { id: previa?.id ?? null, datos }
      continue
    }

    // Fila existente: por id corto; si no hay id, por número.
    let fila: FilaIpercTexto | undefined
    if (b.idCorto) {
      const candidatas = filasActuales.filter((f) => f.id.toLowerCase().endsWith(b.idCorto!))
      fila = candidatas.length === 1 ? candidatas[0] : candidatas.find((f) => f.numero === b.numero)
    }
    if (!fila && b.numero != null) {
      fila = filasActuales.find((f) => f.numero === b.numero)
      if (fila && b.idCorto) res.avisos.push(`${ref}: el id no coincide; se usó la fila N° ${b.numero}`)
    }
    if (!fila) { res.errores.push(`${ref}: no existe esa fila en el IPERC (¿la IA cambió el número o el id?)`); continue }
    if (vistas.has(fila.id)) { res.errores.push(`${ref}: la fila ${fila.numero} aparece dos veces`); continue }
    vistas.add(fila.id)
    res.idsVistos.push(fila.id)
    if (conError) continue

    const cambios: Partial<DatosFila> = {}
    const campos: CampoIperc[] = []
    for (const [campo, valor] of Object.entries(conv) as [CampoIperc, string | number][]) {
      if (!igual(fila[campo], valor)) {
        ;(cambios as Record<string, unknown>)[campo] = valor
        campos.push(campo)
      }
    }
    if (campos.length) res.cambiadas.push({ id: fila.id, numero: fila.numero, cambios, campos, antes: fila })
    else res.sinCambios++
    const { id: _id, numero: _numero, ...datosFila } = fila
    anterior = { id: fila.id, datos: { ...datosFila, ...cambios } }
  }
  return res
}

/** "ALTO (4) → MEDIO (12)" para mostrar el efecto de un cambio de valoración. */
export function textoNivel(sev: number, prob: string): string {
  const ev = evaluarRiesgo(sev, prob)
  return ev ? `${ev.nivel} (${ev.valor})` : `${sev}${prob}`
}
