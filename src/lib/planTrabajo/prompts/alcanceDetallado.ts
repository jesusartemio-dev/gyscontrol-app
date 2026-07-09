/**
 * Prompts de la Etapa 2 para alcanceDetallado (Bloque 4, Tarea 1).
 * La estructura (numeración, nombres, IDs) la arma el servidor
 * (alcanceEstructura.ts) — estos prompts SOLO piden texto de `descripcion`,
 * nunca estructura, y exigen que los IDs recibidos se devuelvan intactos.
 */

export const SYSTEM_RESUMEN_EDTS = `
Eres el Ingeniero de Seguridad Senior de GYS CONTROL INDUSTRIAL SAC,
empresa peruana especializada en proyectos electromecánicos, automatización
e instrumentación.

Vas a redactar descripciones BREVES para EDTs de fases de gestión/soporte
(Planificación, Ingeniería, Procura, Cierre) de un Plan de Trabajo.
La estructura y los IDs de estos EDTs YA ESTÁN RESUELTOS por el sistema —
tu única tarea es escribir el texto de "descripcion" para cada uno.

REGLAS:
- Devolvé EXACTAMENTE un objeto por cada "id" recibido en la lista de EDTs,
  ni uno más ni uno menos.
- NUNCA cambies, acortes ni inventes un "id" — copialo tal cual del input.
- Cada descripcion: UNA oración técnica (15-25 palabras aprox.), sin bullets,
  sin markdown.
- No inventes datos, cifras, fechas ni nombres que no estén en el contexto.
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

interface EdtParaResumen {
  id: string
  edtNombre: string
  faseNombre: string
}

export function buildUserResumenEdts(
  edts: EdtParaResumen[],
  hechosEtapa1: string,
  notaCorrectiva = ''
): string {
  return [
    hechosEtapa1,
    '',
    'EDTs A DESCRIBIR (devolvé una descripción por cada uno, con el mismo "id"):',
    JSON.stringify(edts, null, 2),
    notaCorrectiva,
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown):',
    '{ "descripciones": [{ "id": "string — copiado tal cual del input", "descripcion": "string — una oración" }] }',
  ].join('\n')
}

export const SYSTEM_DETALLE_EDT = `
Eres el Ingeniero de Seguridad Senior de GYS CONTROL INDUSTRIAL SAC,
empresa peruana especializada en proyectos electromecánicos, automatización
e instrumentación.

Vas a redactar la descripción técnica de UN EDT de la fase de EJECUCIÓN
(Construcción/Comisionamiento) de un Plan de Trabajo, y de cada una de sus
actividades (subItems). La estructura, numeración e IDs de este EDT y sus
subItems YA ESTÁN RESUELTOS por el sistema — tu única tarea es escribir el
texto de "edtDescripcion" y el "descripcion" de cada subItem.

ESTILO (plan de trabajo Nexa):
- edtDescripcion: 2-4 oraciones técnicas describiendo el alcance general del EDT.
- Cada subItem.descripcion: 2-4 oraciones técnicas y ESPECÍFICAS de esa
  actividad — nunca repitas la misma descripción en dos actividades distintas,
  y nunca reutilices el texto de edtDescripcion en un subItem.
  Ejemplo de estilo esperado: "Se realizará el tendido de cable de fuerza
  desde la sala eléctrica X mediante bandejas existentes; para esta actividad
  se armará andamio de N cuerpos certificado y personal calificado en
  trabajos eléctricos energizados y no energizados."
- Fundamentá la descripción en las tareas reales de cada actividad (nombres,
  horas, personas) que se incluyen más abajo — no inventes actividades,
  equipos ni cifras que no estén en el contexto.

REGLAS:
- Devolvé EXACTAMENTE un subItem por cada "id" de subItem recibido, mismos IDs.
- NUNCA cambies, acortes ni inventes ningún "id" — copialos tal cual del input.
- Si el EDT no tiene subItems, devolvé "subItems": [].
- Devolvé SOLO el JSON, sin markdown ni texto antes o después.
`.trim()

interface SubItemParaDetalle {
  id: string
  actividadNombre: string
  tareas: { nombre: string; horasEstimadas: number | null; personasEstimadas: number }[]
}

interface EdtParaDetalle {
  id: string
  edtNombre: string
  faseNombre: string
  subItems: SubItemParaDetalle[]
}

export function buildUserDetalleEdt(
  edt: EdtParaDetalle,
  hechosEtapa1: string,
  notaCorrectiva = ''
): string {
  return [
    hechosEtapa1,
    '',
    'EDT A DESCRIBIR (con sus actividades/subItems y tareas reales del cronograma):',
    JSON.stringify(edt, null, 2),
    notaCorrectiva,
    '',
    'ESQUEMA DE OUTPUT (devolvé EXACTAMENTE este JSON, sin markdown):',
    `{ "id": "${edt.id}", "edtDescripcion": "string — 2-4 oraciones", "subItems": [{ "id": "string — copiado tal cual", "descripcion": "string — 2-4 oraciones" }] }`,
  ].join('\n')
}
