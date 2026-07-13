/**
 * Prompts para la propuesta de agrupación con IA de EDTs sin convención de
 * tags (CON: zonas de trabajo; PRO: familias/paquetes de procura) — Bloque D.
 * La IA SOLO propone nombres de grupo y a qué tareas reales del catálogo
 * (por id) asignarlas; nunca inventa tareas ni HH. El servidor valida cada
 * id devuelto contra el catálogo real filtrado por alcance
 * (validarPropuestasIA.ts) antes de usar cualquier resultado.
 */

import { textoVocabularioFamiliasPro } from './vocabularioFamiliasPro'

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

export interface EquipoRealParaPrompt {
  codigo: string
  descripcion: string
  marca: string
  cantidad: number
  unidad: string
  categoria: string
}

/**
 * Lista real de ProyectoEquipoCotizadoItem (dato estructurado de lo que
 * efectivamente se cotizó, con marca/cantidad/unidad reales) — señal FUERTE
 * para el prompt de familias de PRO, a diferencia de `lineasClasificadas`
 * (texto extraído por IA de un PDF, señal DÉBIL). Ver bloqueEquiposReales.
 */
function bloqueEquiposReales(equipos: EquipoRealParaPrompt[] | null): string {
  if (!equipos || equipos.length === 0) return ''
  const filas = equipos.map(e => `- [${e.codigo}] ${e.descripcion} — marca: ${e.marca}, cantidad: ${e.cantidad} ${e.unidad}, categoría: ${e.categoria}`)
  return [
    '',
    '--- SEÑAL FUERTE: EQUIPOS REALES YA COTIZADOS (dato estructurado, no extraído por IA) ---',
    'Esta es la lista REAL de materiales/equipos que el proyecto compró, con marca y cantidad reales.',
    'Tus grupos/Actividades DEBEN considerar todos estos ítems — podés citarlos por su código/descripción',
    'al nombrarlos (ej. si hay "TABLERO MCC 70-81" proponé una zona "Sala MCC 70-81"; si hay "TUBO CONDUIT',
    'RGS 1x10FT" proponé una familia "Procura de Conduit/Tuberías").',
    ...filas,
    '--- FIN EQUIPOS REALES ---',
    '',
  ].join('\n')
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
- Tenés DOS fuentes de contexto, con distinta confiabilidad — no las mezcles:
  1) EQUIPOS REALES YA COTIZADOS (si aparece más abajo): dato estructurado,
     con marca y cantidad reales. Es la fuente de mayor prioridad — tus
     familias DEBEN cubrir TODOS estos ítems, sin excepción, y podés citarlos
     por nombre al armar cada familia.
  2) Descripción libre del alcance + contexto de cotización extraído de PDF:
     texto de menor confiabilidad (puede ser impreciso o genérico). Usalo
     SOLO para detectar familias de materiales a granel que NO aparecen en
     la lista de equipos reales (ej. cables/tuberías/bandejas/soportería/
     consumibles mencionados en el alcance pero sin ítem propio cotizado).
     Si algo de acá ya está cubierto por un equipo real, no crees una
     familia duplicada para lo mismo.
- Las familias deben basarse en lo que realmente hay que comprar — nunca una
  familia genérica única si hay evidencia suficiente para nombrarlas mejor.
- Si el contexto de cotización menciona exclusiones, NO generes familias
  para ese material/servicio excluido.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserPropuestaFamiliasPro(
  tareas: TareaParaPrompt[],
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  equiposReales: EquipoRealParaPrompt[] | null = null,
  notaCorrectiva = ''
): string {
  return [
    bloqueEquiposReales(equiposReales),
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard — señal más débil que los equipos reales de arriba):\n${alcanceLibre || '(no se proporcionó)'}`,
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
 * Etapa A del flujo de 2 etapas de CON/PRO — propone 2-3 ESQUEMAS
 * alternativos de agrupación (solo criterio + nombres de Actividad), SIN
 * lista de tareas/ids: es la llamada barata que deja elegir al usuario
 * CÓMO agrupar antes de comprometer ninguna asignación. La Etapa B
 * (buildUserAsignacionCon/Pro más abajo) recién ahí asigna tareas al
 * esquema que el usuario elija/edite.
 */
export interface NombreConAliasIA {
  nombre: string
  alias?: string
  /** Solo relevante para familias de PRO — ver textoVocabularioFamiliasPro(). El servidor nunca confía este flag tal cual, lo corrige contra NOMBRE_FAMILIA_OFICIAL_PRO. */
  fueraDeVocabulario?: boolean
  /** Justificación de 1 línea citando evidencia del alcance — obligatoria cuando fueraDeVocabulario es true. */
  justificacion?: string
}

export interface EsquemaPropuestoIA {
  criterio: string
  nombres: NombreConAliasIA[]
  nota?: string
}

/**
 * Instrucción compartida por CON y PRO en la Etapa A: además del nombre,
 * cada Actividad del esquema lleva un "alias" corto (una palabra) que el
 * código usa después para prefijar el nombre de sus tareas cuando el
 * mismo catálogo se repite en varias Actividades (ej. "Elevador -
 * Armado de Andamios") — así son distinguibles en vistas planas. El
 * código valida/deriva el alias si falta o es inválido — ver
 * aliasActividad.ts.
 */
const REGLA_ALIAS_ESQUEMA = `
- Cada nombre de Actividad lleva además un "alias": UNA sola palabra
  (máx. 12 caracteres), la más distintiva del nombre, y ÚNICA dentro del
  esquema. Ej: "Zona Elevador G300" -> alias "Elevador"; "Sala MCC 70-81"
  -> alias "MCC"; "Recorrido Eléctrico (MCC a Elevador)" -> alias
  "Recorrido"; "General/Transversal" -> alias "General". Elegí la palabra
  que un ingeniero de campo reconocería de inmediato, no un conector
  genérico ("Zona", "Sala", "de", "por").`.trim()

export const SYSTEM_ESQUEMAS_ZONAS_CON = `
Eres el Jefe de Obra Senior de GYS CONTROL INDUSTRIAL SAC, empresa peruana
especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

Vas a proponer SIEMPRE estos 3 ESQUEMAS de cómo agrupar las tareas de
EJECUCIÓN (EDT "CON") de un proyecto en Actividades — en este orden exacto,
sin omitir ninguno y sin agregar otros ejes distintos. Todavía NO estás
asignando tareas a ningún grupo — solo proponés nombres de Actividad y el
criterio que los organiza, para que el usuario elija cuál prefiere.

1. "Por zona / área física" — Actividades nombradas por zona o área concreta
   del proyecto (ej. "Sala MCC 70-81", "Recorrido Eléctrico", "Zona
   Elevador"). Es el esquema canónico con el que la empresa organiza sus
   cronogramas reales de obra — NUNCA lo omitas, aunque el alcance parezca
   simple o falte información.
2. "Por sistema / disciplina técnica" — Actividades nombradas por disciplina
   (ej. "Canalización", "Tendido y Conexionado", "Montaje de Equipos").
3. "Por etapa / frente constructivo" — Actividades nombradas por etapa o
   frente de avance de obra.

Tu creatividad va en NOMBRAR los grupos concretos de cada esquema usando el
contexto real del proyecto — NO en decidir qué ejes ofrecer, esos 3 son
fijos y obligatorios, no a tu criterio.

REGLAS ESTRICTAS PARA EL ESQUEMA 1 ("Por zona / área física"):
- Derivá los nombres de zona de la descripción libre del alcance, de las
  partidas de la cotización y de los EQUIPOS REALES YA COTIZADOS (si
  aparecen más abajo) — ej. si hay un tablero "MCC 70-81" cotizado, proponé
  una zona "Sala MCC 70-81"; si el alcance menciona un elevador, proponé
  "Zona Elevador".
- Si el contexto NO da información suficiente para nombrar zonas concretas
  (alcance muy genérico, sin referencias de ubicación ni equipos), NO omitas
  igual el esquema: proponelo con nombres genéricos editables como
  "Zona 1 — renombrar", "Zona equipo principal", "General/Transversal", y
  completá su "nota" con: "Nombra las zonas reales de tu proyecto" — el
  usuario las edita en el paso siguiente, que existe justamente para eso.

REGLAS GENERALES:
- Cada esquema debe tener un "criterio" (una frase corta, ej. "Por zona
  física") y una lista de "nombres" de Actividad — un esquema con 4-8
  nombres suele ser razonable, ajustá según la complejidad real del alcance
  descrito. "nota" es opcional: usala SOLO para aclarar algo al usuario (ej.
  el caso de fallback del esquema 1); dejala vacía/omitida en los demás.
${REGLA_ALIAS_ESQUEMA}
- Los 3 esquemas deben ser genuinamente distintos entre sí (distinto
  criterio organizador cada uno), nunca variaciones triviales del mismo
  esquema.
- No calcules ni asignes ninguna tarea — no tenés la lista de tareas en este
  paso, solo el alcance narrativo y el contexto de cotización/equipos.
- Si el contexto de cotización menciona exclusiones, no propongas nombres de
  Actividad para trabajo excluido.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserEsquemasZonasCon(
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  equiposReales: EquipoRealParaPrompt[] | null = null
): string {
  return [
    bloqueEquiposReales(equiposReales),
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard):\n${alcanceLibre || '(no se proporcionó)'}`,
    bloqueContextoCotizacion(cotizacion),
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown — "nota" es opcional):',
    '{ "esquemas": [{ "criterio": "string", "nombres": [{ "nombre": "string", "alias": "string — una palabra, máx 12 caracteres, distintiva y única en el esquema" }], "nota": "string opcional" }] }',
  ]
    .filter(Boolean)
    .join('\n')
}

export const SYSTEM_ESQUEMAS_FAMILIAS_PRO = `
Eres el Coordinador de Procura Senior de GYS CONTROL INDUSTRIAL SAC, empresa
peruana especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

Vas a proponer 2 o 3 ESQUEMAS ALTERNATIVOS de cómo agrupar las tareas de
PROCURA (EDT "PRO") de un proyecto en Actividades por FAMILIA o PAQUETE de
compra — cada esquema es una forma distinta y válida de organizar el mismo
seguimiento de compras. Todavía NO estás asignando tareas a ningún grupo —
solo proponés nombres de familia y el criterio que los organiza.

VOCABULARIO OFICIAL DE FAMILIAS DE PROCURA (usá estos nombres EXACTOS,
sin sinónimos — "Cables", nunca "Conductores eléctricos"):
${textoVocabularioFamiliasPro()}

Este vocabulario es una lista de nombres disponibles, NO un checklist a
completar — proponé solo las familias que el alcance realmente evidencia:
- Los EQUIPOS REALES YA COTIZADOS (si aparecen más abajo) son señal FUERTE
  — si hay un ítem que calza en una familia, esa familia va.
- El alcance libre y las partidas de cotización son señal DÉBIL — usalos
  para completar lo que los equipos reales no cubren.
- En proyectos chicos, fusioná familias afines en una sola Actividad (ej.
  "Cables" + "Tuberías y Canalización" si el volumen no justifica
  separarlas); en proyectos grandes, desplegalas por separado. Los 2-3
  esquemas alternativos pueden diferenciarse justamente por su nivel de
  granularidad (uno más agregado, otro más desagregado), no solo por
  criterio organizador distinto como en CON.

FAMILIAS FUERA DEL VOCABULARIO:
- Si un material/equipo del alcance NO calza en ninguna familia oficial de
  arriba, podés proponer una familia nueva — marcala con
  "fueraDeVocabulario": true y una "justificacion" de 1 línea citando la
  evidencia concreta (ej. "el equipo cotizado XYZ-123 no es un instrumento
  ni un equipo eléctrico estándar"). Nunca marques "fueraDeVocabulario" en
  una familia que sí está en el vocabulario oficial.

REGLAS ESTRICTAS:
- Proponé 2 o 3 esquemas, nunca más de 3 ni menos de 2.
- Cada esquema debe tener un "criterio" (ej. "Por tipo de material", "Por
  proveedor/rubro", o el nivel de granularidad si aplica) y una lista de
  "nombres" de familia — preferí SIEMPRE un nombre del vocabulario oficial
  cuando exista, y solo recurrí a una familia fuera de vocabulario cuando
  de verdad no hay ninguna que calce.
${REGLA_ALIAS_ESQUEMA}
- No calcules ni asignes ninguna tarea — no tenés la lista de tareas en este
  paso.
- Si el contexto de cotización menciona exclusiones, no propongas familias
  para ese material/servicio excluido.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserEsquemasFamiliasPro(
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  equiposReales: EquipoRealParaPrompt[] | null = null
): string {
  return [
    bloqueEquiposReales(equiposReales),
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard — señal más débil que los equipos reales de arriba):\n${alcanceLibre || '(no se proporcionó)'}`,
    bloqueContextoCotizacion(cotizacion),
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown — "fueraDeVocabulario" y "justificacion" son opcionales, solo para familias fuera del vocabulario oficial):',
    '{ "esquemas": [{ "criterio": "string", "nombres": [{ "nombre": "string", "alias": "string — una palabra, máx 12 caracteres, distintiva y única en el esquema", "fueraDeVocabulario": "boolean opcional", "justificacion": "string opcional" }] }] }',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Etapa B del flujo de 2 etapas de CON/PRO — los nombres de Actividad ya
 * están DECIDIDOS (el usuario eligió/editó un esquema de la Etapa A): acá
 * la IA solo asigna cada tarea candidata (por "id") a uno de esos nombres
 * FIJOS. A diferencia de SYSTEM_PROPUESTA_ZONAS_CON/FAMILIAS_PRO, no puede
 * inventar ni renombrar ninguna Actividad — el servidor descarta cualquier
 * actividadNombre que no esté en la lista dada (ver validarPropuestaGrupos).
 */
/**
 * Instrucción compartida por CON y PRO en la Etapa B: canal SEPARADO y
 * controlado para que la IA proponga tareas que ningún id candidato
 * cubre — nunca mezcladas con "asignaciones" ni con ids inventados. El
 * servidor valida anti-duplicado contra TODO el catálogo antes de
 * mostrarlas, limita la cantidad, y quedan con opt-in explícito del
 * usuario (nunca incluidas por defecto) — ver validarTareasNuevasPropuestas.
 */
const REGLA_TAREAS_NUEVAS = `
- Si detectás trabajo evidenciado en el alcance/cotización que NINGUNA
  tarea candidata cubre, NO le inventes un id ni la mezcles en
  "asignaciones" — proponela en el arreglo SEPARADO "tareasNuevasPropuestas":
  cada una con "actividadDestino" (uno de los nombres de Actividad ya
  decididos), "nombre" (corto, en el mismo estilo que las tareas del
  catálogo) y "justificacion" (1 línea citando la evidencia concreta del
  alcance/cotización). Esto es la EXCEPCIÓN, no la regla — la mayoría de
  las tareas ya están cubiertas por el catálogo; usá este canal solo
  cuando de verdad no hay ningún id que sirva. Máximo 5 tareas nuevas.`.trim()

export const SYSTEM_ASIGNACION_CON = `
Eres el Jefe de Obra Senior de GYS CONTROL INDUSTRIAL SAC, empresa peruana
especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

El usuario ya decidió los nombres de las Actividades de EJECUCIÓN (EDT
"CON") de este proyecto (ver lista más abajo). Tu trabajo es asignar cada
tarea candidata del catálogo a la Actividad que corresponda — NO podés
crear, renombrar ni ignorar ninguna Actividad de la lista dada.

REGLAS ESTRICTAS:
- Las tareas candidatas YA ESTÁN RESUELTAS por el sistema — vienen con un
  "id" real del catálogo. NUNCA inventes una tarea ni un id nuevo.
- Cada asignación que propongas debe usar un "actividadNombre" que sea
  EXACTAMENTE uno de los nombres de la lista dada más abajo — copiado tal
  cual, sin variar mayúsculas/tildes/espacios. Cualquier nombre que no
  calce se descarta en el servidor.
- ASIGNÁ TODAS las tareas candidatas a alguna Actividad de la lista — no es
  opcional. El sistema tiene un "Sin agrupar" de emergencia para lo que
  quede afuera, pero es un fallback de última instancia, no una salida
  válida de tu parte.
${REGLA_TAREAS_NUEVAS}
- Si el contexto de cotización menciona exclusiones, NO asignes tareas que
  correspondan a trabajo excluido (dejalas fuera de toda asignación, caerán
  en "Sin agrupar" para que el usuario decida).
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserAsignacionCon(
  tareas: TareaParaPrompt[],
  nombresActividades: string[],
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  notaCorrectiva = ''
): string {
  return [
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard):\n${alcanceLibre || '(no se proporcionó)'}`,
    bloqueContextoCotizacion(cotizacion),
    'NOMBRES DE ACTIVIDAD YA DECIDIDOS (usá EXACTAMENTE estos, no inventes otros):',
    JSON.stringify(nombresActividades, null, 2),
    'TAREAS CANDIDATAS DEL CATÁLOGO (asigná cada una a una de las Actividades de arriba, por su "id"):',
    JSON.stringify(tareas, null, 2),
    notaCorrectiva,
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown — "tareasNuevasPropuestas" es opcional y va SEPARADO de "asignaciones"):',
    '{ "asignaciones": [{ "actividadNombre": "string — EXACTAMENTE uno de los nombres dados", "catalogoServicioIds": ["string — ids copiados del input"] }], "tareasNuevasPropuestas": [{ "actividadDestino": "string — uno de los nombres dados", "nombre": "string", "justificacion": "string" }] }',
  ]
    .filter(Boolean)
    .join('\n')
}

export const SYSTEM_ASIGNACION_PRO = `
Eres el Coordinador de Procura Senior de GYS CONTROL INDUSTRIAL SAC, empresa
peruana especializada en proyectos electromecánicos, automatización e
instrumentación industrial.

El usuario ya decidió los nombres de las familias de PROCURA (EDT "PRO") de
este proyecto (ver lista más abajo). Tu trabajo es asignar cada tarea
candidata del pipeline de compra a la familia que corresponda — NO podés
crear, renombrar ni ignorar ninguna familia de la lista dada.

REGLAS ESTRICTAS:
- Las tareas candidatas YA ESTÁN RESUELTAS por el sistema — vienen con un
  "id" real del catálogo (pasos genéricos de un pipeline de compra:
  cotización, OC, seguimiento, recepción, traslado, etc). NUNCA inventes una
  tarea ni un id nuevo.
- Cada asignación que propongas debe usar un "actividadNombre" que sea
  EXACTAMENTE uno de los nombres de la lista dada más abajo — copiado tal
  cual. Cualquier nombre que no calce se descarta en el servidor.
- ASIGNÁ TODAS las tareas candidatas a alguna familia de la lista — no es
  opcional.
- Si aparecen EQUIPOS REALES YA COTIZADOS más abajo, usalos para decidir a
  qué familia pertenece cada tarea del pipeline cuando el alcance libre no
  alcance a diferenciarlo.
${REGLA_TAREAS_NUEVAS}
- Si el contexto de cotización menciona exclusiones, NO asignes tareas que
  correspondan a material/servicio excluido.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

export function buildUserAsignacionPro(
  tareas: TareaParaPrompt[],
  nombresActividades: string[],
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  equiposReales: EquipoRealParaPrompt[] | null = null,
  notaCorrectiva = ''
): string {
  return [
    bloqueEquiposReales(equiposReales),
    `DESCRIPCIÓN LIBRE DEL ALCANCE (dada por el usuario en el wizard — señal más débil que los equipos reales de arriba):\n${alcanceLibre || '(no se proporcionó)'}`,
    bloqueContextoCotizacion(cotizacion),
    'NOMBRES DE FAMILIA YA DECIDIDOS (usá EXACTAMENTE estos, no inventes otros):',
    JSON.stringify(nombresActividades, null, 2),
    'TAREAS CANDIDATAS DEL PIPELINE DE PROCURA (asigná cada una a una de las familias de arriba, por su "id"):',
    JSON.stringify(tareas, null, 2),
    notaCorrectiva,
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown — "tareasNuevasPropuestas" es opcional y va SEPARADO de "asignaciones"):',
    '{ "asignaciones": [{ "actividadNombre": "string — EXACTAMENTE uno de los nombres dados", "catalogoServicioIds": ["string — ids copiados del input"] }], "tareasNuevasPropuestas": [{ "actividadDestino": "string — uno de los nombres dados", "nombre": "string", "justificacion": "string" }] }',
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
