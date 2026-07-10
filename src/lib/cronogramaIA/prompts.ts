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
- ASIGNÁ TODAS las tareas candidatas a algún grupo — no es opcional. Antes de
  responder, verificá que cada id de la lista de entrada aparece en al menos
  un grupo de tu respuesta. El sistema tiene un "Sin agrupar" de emergencia
  para lo que quede afuera, pero eso es un fallback de última instancia, NO
  una salida válida de tu parte — tu trabajo es que quede vacío.
- Los nombres de zona deben ser específicos y basados en la descripción de
  alcance real del proyecto (ej. "Sala Eléctrica", "Zona de Tanques",
  "Frente Norte") — nunca genéricos como "Zona 1" si hay información
  suficiente para nombrarlas mejor.
- No todas las tareas corresponden a una zona física: método/clasificación de
  trabajo (ej. "Trabajos en espacio confinado", "Trabajos con Manlift"),
  desmontaje o preparación general no atada a un área puntual, o disciplinas
  que corren transversales a todas las zonas, van en un grupo aparte llamado
  "General / Transversal" — es una zona legítima, no una falla. Usala en vez
  de forzar esas tareas dentro de una zona física a la que no pertenecen.
- Para las demás tareas (ej. instalación de instrumentos de campo, cableado,
  montaje de equipos), esforzate en ubicarlas en la zona física real donde se
  ejecutan según la descripción de alcance y el nombre/descripción de la
  tarea — no las mandes a "General / Transversal" solo porque no es obvio a
  primera vista; son la mayoría de los casos.
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

export interface ContextoInstanciasParaPrompt {
  tableros: string[]
  plcs: string[]
  hmiCantidad: number
  scada: boolean
}

function bloqueContextoInstancias(ctx: ContextoInstanciasParaPrompt | null): string {
  if (!ctx) return ''
  const partes: string[] = []
  if (ctx.tableros.length > 0) {
    partes.push('TABLEROS DEL PROYECTO (dados por el usuario en el Paso 1):', ...ctx.tableros.map(t => `- ${t}`))
  }
  if (ctx.plcs.length > 0) {
    partes.push('NOMBRES DE PLC YA DADOS POR EL USUARIO EN EL PASO 1 (usalos tal cual, uno por Actividad, no los ignores):', ...ctx.plcs.map(p => `- ${p}`))
  }
  if (ctx.hmiCantidad > 0) {
    partes.push(`N° de estaciones HMI estimado por el usuario en el Paso 1: ${ctx.hmiCantidad} (referencia, no una regla estricta).`)
  }
  if (ctx.scada) {
    partes.push('El proyecto integra con un sistema SCADA existente del cliente (confirmado en el Paso 1).')
  }
  if (partes.length === 0) return ''
  return ['', '--- CONTEXTO DE TABLEROS / HMI DEL PASO 1 ---', ...partes, '--- FIN CONTEXTO ---', ''].join('\n')
}

export const SYSTEM_PROPUESTA_INSTANCIAS_PLC = `
Eres el Ingeniero de Automatización Senior de GYS CONTROL INDUSTRIAL SAC,
empresa peruana especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

Vas a proponer las Actividades de PROGRAMACIÓN DE PLC (EDT "PLC") de un
proyecto. El catálogo de PLC no distingue tareas por zona ni tablero: es el
mismo pipeline de programación (lógica, pruebas, documentación) que se repite
por cada controlador PLC real del proyecto. Tu trabajo es DETECTAR cuántos
controladores PLC hay — a partir de los tableros del proyecto y la
descripción de alcance — y proponer una Actividad por cada uno.

REGLAS ESTRICTAS:
- Las tareas candidatas YA ESTÁN RESUELTAS por el sistema — vienen con un
  "id" real del catálogo. NUNCA inventes una tarea ni un id nuevo.
- Cada Actividad que propongas debe representar UN controlador PLC real, con
  el pipeline completo de tareas candidatas asignado (usando SOLO ids que
  aparecen literalmente en la lista del input).
- Si el usuario ya dio nombres de PLC específicos en el Paso 1, usalos
  directamente — una Actividad por cada nombre dado, sin inventar otros.
- Si NO hay nombres de PLC dados en el Paso 1, deducí la cantidad de
  controladores a partir de los tableros del proyecto y la descripción de
  alcance, y nombrá cada Actividad de forma identificable (ej.
  "Programación PLC-001", o si un tablero da un TAG claro y hay evidencia de
  que aloja el controlador, "Programación PLC - Tablero TCO-CMN-001").
- Si no hay nombres de PLC dados y el alcance/tableros no dan ningún indicio
  de que el proyecto incluya programación de PLC, NO propongas ninguna
  Actividad — es preferible 0 actividades que una inventada.
- Si el contexto de cotización menciona exclusiones, NO generes Actividades
  para controladores excluidos del contrato.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserPropuestaInstanciasPlc(
  tareas: TareaParaPrompt[],
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  contextoInstancias: ContextoInstanciasParaPrompt | null,
  notaCorrectiva = ''
): string {
  return [
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard):\n${alcanceLibre || '(no se proporcionó)'}`,
    bloqueContextoInstancias(contextoInstancias),
    bloqueContextoCotizacion(cotizacion),
    'TAREAS CANDIDATAS DEL CATÁLOGO (asigná cada una a la Actividad de PLC que corresponda, por su "id"):',
    JSON.stringify(tareas, null, 2),
    notaCorrectiva,
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown):',
    '{ "grupos": [{ "nombre": "string — nombre del controlador PLC", "catalogoServicioIds": ["string — ids copiados del input"] }] }',
  ]
    .filter(Boolean)
    .join('\n')
}

export const SYSTEM_PROPUESTA_INSTANCIAS_HMI = `
Eres el Ingeniero de Automatización Senior de GYS CONTROL INDUSTRIAL SAC,
empresa peruana especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

Vas a proponer las Actividades de HMI (EDT "HMI") de un proyecto: pantallas o
estaciones de operador locales y, si aplica, integración a un sistema SCADA
existente del cliente. El catálogo de HMI no distingue tareas por estación:
es el mismo pipeline (configuración de pantallas, tags, pruebas) que se
repite por cada estación HMI real, más un pipeline aparte para SCADA si
corresponde.

REGLAS ESTRICTAS:
- Las tareas candidatas YA ESTÁN RESUELTAS por el sistema — vienen con un
  "id" real del catálogo. NUNCA inventes una tarea ni un id nuevo.
- Proponé una Actividad por cada estación HMI física distinta que puedas
  identificar (ej. "HMI Sala de Control", "HMI Local Tablero TCO-001"). Si no
  hay forma de diferenciarlas por nombre, usá el N° de estaciones estimado
  por el usuario en el Paso 1 como referencia para la cantidad de Actividades
  ("Estación HMI 1", "Estación HMI 2", ...).
- Si el Paso 1 confirma integración a un SCADA existente del cliente, proponé
  una Actividad separada "Integración SCADA" con las tareas de
  integración/protocolo correspondientes — nunca mezcles esas tareas con las
  de una estación HMI local.
- Si no hay evidencia de HMI ni de SCADA en el alcance/contexto, NO propongas
  ninguna Actividad — es preferible 0 actividades que una inventada.
- Si el contexto de cotización menciona exclusiones, NO generes Actividades
  para ese alcance excluido.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserPropuestaInstanciasHmi(
  tareas: TareaParaPrompt[],
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  contextoInstancias: ContextoInstanciasParaPrompt | null,
  notaCorrectiva = ''
): string {
  return [
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard):\n${alcanceLibre || '(no se proporcionó)'}`,
    bloqueContextoInstancias(contextoInstancias),
    bloqueContextoCotizacion(cotizacion),
    'TAREAS CANDIDATAS DEL CATÁLOGO (asigná cada una a la Actividad de HMI/SCADA que corresponda, por su "id"):',
    JSON.stringify(tareas, null, 2),
    notaCorrectiva,
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown):',
    '{ "grupos": [{ "nombre": "string — nombre de la estación HMI o \\"Integración SCADA\\"", "catalogoServicioIds": ["string — ids copiados del input"] }] }',
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
