/**
 * Prompts para la propuesta de agrupación con IA de EDTs sin convención de
 * tags (CON: zonas de trabajo; PRO: familias/paquetes de procura) — Bloque D.
 * La IA SOLO propone nombres de grupo y a qué tareas reales del catálogo
 * (por id) asignarlas; nunca inventa tareas ni HH. El servidor valida cada
 * id devuelto contra el catálogo real filtrado por alcance
 * (validarPropuestasIA.ts) antes de usar cualquier resultado.
 */

export interface TareaParaPrompt {
  id: string
  nombre: string
  descripcion: string
}

export interface LineaCotizacionParaPrompt {
  descripcion: string
  monto: number
}

export interface ContextoCotizacionParaPrompt {
  resumenAlcance: string[]
  exclusiones: string[]
  lineas: LineaCotizacionParaPrompt[]
}

function bloqueContextoCotizacion(ctx: ContextoCotizacionParaPrompt | null): string {
  if (!ctx) return ''
  const partes: string[] = []
  if (ctx.resumenAlcance.length > 0) {
    partes.push('RESUMEN DE ALCANCE DE LA COTIZACIÓN (extraído del contrato real):', ...ctx.resumenAlcance.map(b => `- ${b}`))
  }
  if (ctx.exclusiones.length > 0) {
    partes.push('', 'EXCLUSIONES CONTRACTUALES (NO generes ni asumas trabajo aquí):', ...ctx.exclusiones.map(b => `- ${b}`))
  }
  if (ctx.lineas.length > 0) {
    partes.push('', 'PARTIDAS RELEVANTES DE LA COTIZACIÓN (referencia de qué se contrató, no son tareas del catálogo):')
    partes.push(...ctx.lineas.map(l => `- ${l.descripcion} ($${l.monto.toLocaleString()})`))
  }
  if (partes.length === 0) return ''
  return ['', '--- CONTEXTO DE LA COTIZACIÓN REAL DEL PROYECTO ---', ...partes, '--- FIN CONTEXTO COTIZACIÓN ---', ''].join('\n')
}

export const SYSTEM_PROPUESTA_ZONAS_CON = `
Eres el Jefe de Obra Senior de GYS CONTROL INDUSTRIAL SAC, empresa peruana
especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

Vas a proponer cómo agrupar las tareas de EJECUCIÓN (EDT "CON") de un
proyecto en Actividades por ZONA, ÁREA o FRENTE de trabajo — así se
planifican y asignan cuadrillas en campo.

REGLAS ESTRICTAS:
- Las tareas candidatas YA ESTÁN RESUELTAS por el sistema — vienen con un
  "id" real del catálogo. NUNCA inventes una tarea ni un id nuevo.
- Cada grupo que propongas debe listar SOLO ids que aparecen literalmente en
  la lista de tareas candidatas del input. Copiá los ids tal cual.
- No es obligatorio usar todas las tareas en un solo grupo, pero SÍ debés
  intentar asignar cada tarea candidata a algún grupo — el sistema se
  encarga de las que queden sin asignar.
- Los nombres de zona deben ser específicos y basados en la descripción de
  alcance real del proyecto (ej. "Sala Eléctrica", "Zona de Tanques",
  "Frente Norte") — nunca genéricos como "Zona 1" si hay información
  suficiente para nombrarlas mejor.
- Si el contexto de cotización menciona exclusiones, NO generes grupos ni
  asignes tareas que correspondan a trabajo excluido.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserPropuestaZonasCon(
  tareas: TareaParaPrompt[],
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  notaCorrectiva = ''
): string {
  return [
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard):\n${alcanceLibre || '(no se proporcionó)'}`,
    bloqueContextoCotizacion(cotizacion),
    'TAREAS CANDIDATAS DEL CATÁLOGO (asigná cada una a un grupo por su "id"):',
    JSON.stringify(tareas, null, 2),
    notaCorrectiva,
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown):',
    '{ "grupos": [{ "nombre": "string — nombre de la zona", "catalogoServicioIds": ["string — ids copiados del input"] }] }',
  ]
    .filter(Boolean)
    .join('\n')
}

export const SYSTEM_PROPUESTA_FAMILIAS_PRO = `
Eres el Coordinador de Procura Senior de GYS CONTROL INDUSTRIAL SAC, empresa
peruana especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

Vas a proponer cómo agrupar las tareas de PROCURA (EDT "PRO") de un proyecto
en Actividades por FAMILIA o PAQUETE de compra (ej. "Procura de Cables",
"Procura de Equipos de Control", "Alquiler de Manlift") — así se planifica
el seguimiento de compras del proyecto.

REGLAS ESTRICTAS:
- Las tareas candidatas YA ESTÁN RESUELTAS por el sistema — vienen con un
  "id" real del catálogo (son pasos genéricos de un pipeline de compra:
  cotización, OC, seguimiento, recepción, traslado, etc). NUNCA inventes una
  tarea ni un id nuevo.
- Cada FAMILIA que propongas debe incluir el pipeline completo relevante
  para ese tipo de compra, usando SOLO ids que aparecen literalmente en la
  lista de tareas candidatas del input.
- Las familias deben basarse en lo que realmente hay que comprar según el
  alcance del proyecto y el contexto de cotización (ej. si la cotización
  menciona "cables de instrumentación" y "tableros", proponé familias como
  "Procura de Cables" y "Procura de Tableros", no una familia genérica única).
- Si el contexto de cotización menciona exclusiones, NO generes familias
  para ese material/servicio excluido.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserPropuestaFamiliasPro(
  tareas: TareaParaPrompt[],
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  notaCorrectiva = ''
): string {
  return [
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard):\n${alcanceLibre || '(no se proporcionó)'}`,
    bloqueContextoCotizacion(cotizacion),
    'TAREAS CANDIDATAS DEL PIPELINE DE PROCURA (asigná cada una a una familia por su "id"):',
    JSON.stringify(tareas, null, 2),
    notaCorrectiva,
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown):',
    '{ "grupos": [{ "nombre": "string — nombre de la familia/paquete", "catalogoServicioIds": ["string — ids copiados del input"] }] }',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Pre-llenado del Paso 1 del wizard a partir de la cotización real del
 * proyecto — el catálogo es estático (siempre están los mismos EDTs/
 * servicios disponibles), lo que cambia por proyecto es la cotización/TDR.
 * La IA lee eso y sugiere qué EDTs aplican y las respuestas del Paso 1;
 * el usuario revisa y edita todo antes de continuar — nunca se aplica sin
 * pasar por el Paso 1 editable.
 */
export interface EdtParaPrellenado {
  id: string
  nombre: string
  descripcion: string
}

export const SYSTEM_PRELLENADO_PASO1 = `
Eres el Gerente de Proyectos Senior de GYS CONTROL INDUSTRIAL SAC, empresa
peruana especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

Vas a leer la cotización/TDR real de un proyecto (alcance, exclusiones,
partidas contratadas) y sugerir las respuestas del Paso 1 de un wizard que
genera el cronograma — específicamente: qué EDTs del catálogo aplican a
este proyecto, y algunos parámetros de alcance.

REGLAS ESTRICTAS:
- La lista de EDTs candidatos YA ESTÁ RESUELTA por el sistema — viene con
  "id" real del catálogo. Tu "edtsSeleccionados" debe listar SOLO ids que
  aparecen literalmente en esa lista. NUNCA inventes un EDT ni un id nuevo.
- Selecciona un EDT solo si la cotización/alcance da indicios reales de que
  aplica a este proyecto — no selecciones todos "por si acaso".
- "brownfield": true solo si el alcance menciona explícitamente trabajo en
  una planta/instalación YA EXISTENTE u operativa (retrofit, ampliación,
  modificación). Si no hay indicios, dejalo en false.
- "ingenieriaDetalle": true solo si el alcance o las partidas mencionan
  explícitamente ingeniería de detalle como entregable contratado.
- "tableros"/"plcs": solo si la cotización menciona nombres o códigos
  específicos de tableros/PLCs (ej. "TCO-CMN-QUI-007", "PLC Balanza 220").
  Si no hay nombres específicos mencionados, devolvé listas VACÍAS — NUNCA
  inventes nombres genéricos ("Tablero 1", "PLC Principal"), es mejor dejar
  que el usuario los complete a mano.
- "hmiCantidad": tu mejor estimación del número de estaciones HMI si se
  menciona o se puede inferir razonablemente del alcance; si no hay
  indicios, devolvé 0.
- "scada": true solo si el alcance menciona integración a un sistema SCADA
  existente del cliente.
- Todo esto es una SUGERENCIA que el usuario va a revisar y editar antes de
  continuar — ante la duda, preferí dejar un campo vacío/false/0 en vez de
  adivinar.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserPrellenadoPaso1(
  edtsCandidatos: EdtParaPrellenado[],
  cotizacion: ContextoCotizacionParaPrompt
): string {
  return [
    bloqueContextoCotizacion(cotizacion),
    'EDTS CANDIDATOS DEL CATÁLOGO (seleccioná solo los que apliquen, por su "id"):',
    JSON.stringify(edtsCandidatos, null, 2),
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown):',
    '{ "edtsSeleccionados": ["string — ids copiados del input"], "brownfield": boolean, "ingenieriaDetalle": boolean, "tableros": [{ "nombre": "string" }], "plcs": [{ "nombre": "string" }], "hmiCantidad": number, "scada": boolean }',
  ]
    .filter(Boolean)
    .join('\n')
}
