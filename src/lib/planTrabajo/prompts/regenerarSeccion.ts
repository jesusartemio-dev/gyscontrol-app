import type { SeccionRegenerable } from '@/types/planTrabajo'

interface SeccionConfig {
  instruccion: string
  schema: string
}

const CONFIGS: Record<SeccionRegenerable, SeccionConfig> = {
  objetivo: {
    instruccion: `Generá 1-2 párrafos que describan el propósito del trabajo contratado:
- El trabajo encargado por el cliente y la empresa que lo ejecuta (GYS CONTROL INDUSTRIAL SAC).
- La instalación o planta donde se realizará el trabajo.
- Los compromisos contractuales y el tipo de servicio (ingeniería, instalación, comisionamiento, etc.).`,
    schema: `{ "objetivo": "string — 1-2 párrafos descriptivos del propósito del proyecto" }`,
  },

  alcanceGeneral: {
    instruccion: `Generá 2-4 párrafos con el alcance técnico general del proyecto:
- Qué sistemas se intervienen o implementan (HMI, PLC, CAD, instrumentación, etc.).
- Ubicación y características de la planta o instalación del cliente.
- Entregables comprometidos con el cliente (software, planos, informes, comisionamiento).
- Marco contractual (orden de compra, contrato, normas aplicables mencionadas en el TDR).`,
    schema: `{ "alcanceGeneral": "string — 2-4 párrafos con el alcance técnico completo" }`,
  },

  alcanceDetallado: {
    instruccion: `El mensaje incluye la ESTRUCTURA COMPLETA DEL CRONOGRAMA (Fase → EDT → Actividad → Tarea).
Usá esa información como base técnica para construir el alcance detallado.

NUMERACIÓN: Propia del plan de trabajo — 11.1, 11.2, 11.3... (no copies la numeración 4.2, 4.4 del cronograma).

ESTRUCTURA:
- Organizá por Fase → EDT. Podés crear una entrada por EDT o por grupo lógico.
- Para los subItems (actividades): NO es obligatorio listar cada actividad por separado.
  Podés agrupar actividades similares o repetitivas en un solo subItem.
  Ejemplo: en vez de 5 subItems "Instalación de Extractor E013/E062/E503/E2013/E3003",
  usá UN subItem "Instalación de Sistemas de Extractor (E013, E062, E503, E2013, E3003)".

CAMPOS:
- numeracion: 11.1, 11.2... (EDTs); 11.X.Y (subItems) — secuencial del documento
- edtNombre: nombre del EDT (puede ser el del cronograma)
- faseNombre: nombre completo de la fase (PLANIFICACIÓN, EJECUCIÓN, etc.)
- faseAbreviatura: igual a faseNombre — NO uses abreviaturas como EJEC/PROC
- edtCodigo: código si aplica (CON, COM, ING, etc.), sino ""
- edtRefId: ID del EDT del cronograma (aparece como "edtId" en la directiva o "EDT [id=...]" en el contexto)
- descripcion: párrafo narrativo CONCISO de 40-60 palabras. NO bullets.
- subItems.actividadNombre: nombre descriptivo; listá los códigos técnicos al agrupar (E013, E062...)
- subItems.descripcion: párrafo CONCISO de 30-50 palabras con las tareas embebidas en texto narrativo`,
    schema: `{ "alcanceDetallado": [{ "numeracion": "11.1", "edtNombre": "Construcción", "edtCodigo": "CON", "faseNombre": "EJECUCIÓN", "faseAbreviatura": "EJECUCIÓN", "ubicacion": "Site cliente (opcional)", "descripcion": "Párrafo narrativo 80-120 palabras...", "subItems": [{ "numeracion": "11.1.1", "actividadNombre": "Instalación de Sistemas de Extractor (E013, E062, E503, E2013, E3003)", "descripcion": "Párrafo narrativo agrupando instalaciones similares..." }], "edtRefId": "ID del EDT del cronograma" }] }`,
  },

  eppRequeridos: {
    instruccion: `Generá los EPP requeridos basándote en los riesgos identificados en el alcance del proyecto:
- basico: siempre incluir — casco ANSI Z89.1-2014, lentes de seguridad Z87+, zapatos dieléctricos
  Clase EH, guantes de cuero, chaleco reflectivo clase 2.
- bioseguridad: solo si el trabajo implica exposición a sustancias químicas irritantes o biológicas
  (mascarilla KN95, guantes de nitrilo, alcohol gel). Si no aplica, dejá el array vacío.
- riesgoEspecifico: arnés de seguridad + línea de vida si hay trabajo en altura; guantes dieléctricos
  clase 0 si hay trabajo eléctrico en BT; traje contra arco si hay alta tensión; respirador con
  filtro orgánico si hay vapores.
- Incluí la norma técnica cuando sea conocida (ANSI, EN, NTP).`,
    schema: `{ "eppRequeridos": { "basico": [{ "nombre": "string", "norma": "string opcional", "observaciones": "string opcional" }], "bioseguridad": [], "riesgoEspecifico": [] } }`,
  },

  herramientasYEquipos: {
    instruccion: `Generá la lista de recursos necesarios basándote en los servicios y equipos de la cotización:
- equipos: maquinaria mayor que se requiere (manlift, escalera telescópica, taladro percutor,
  esmeril angular, compresor, soldadora, analizador de redes, osciloscopio).
- herramientas: manuales de uso cotidiano (destornilladores, llaves mixtas, alicates,
  multímetro, pinza amperimétrica, wincha, nivel torpedo, laptop de programación).
- materiales: consumibles e insumos (cintillos, cinta aislante, cinta autofundente, conduit,
  terminales, pernos/tuercas, lubricante, etiquetas).
- Usá cantidades cuando se puedan inferir del cronograma o cotización.`,
    schema: `{ "herramientasYEquipos": { "equipos": [{ "nombre": "string", "cantidad": 1, "unidad": "und", "observaciones": "" }], "herramientas": [{ "nombre": "string", "cantidad": 1, "unidad": "und", "observaciones": "" }], "materiales": [{ "nombre": "string", "cantidad": 1, "unidad": "und", "observaciones": "" }] } }`,
  },

  restricciones: {
    instruccion: `Generá 8-15 restricciones aplicables al tipo de trabajo del proyecto.
Categorías válidas: AUTORIZACION, EPP, ALTURA, ELECTRICO, ALCOHOL_DROGAS, GENERAL, CAPACITACION.
Ejemplos según tipo de trabajo:
- AUTORIZACION: Contar con PETAR vigente para trabajo en altura; ART firmada antes de cada tarea.
- EPP: Uso obligatorio de arnés y línea de vida al superar 1.8 m de altura.
- ELECTRICO: Bloqueo LOTO antes de intervenir tableros eléctricos.
- ALCOHOL_DROGAS: Prohibición de ingresar con aliento alcohólico — tolerancia cero.
- CAPACITACION: Todo el personal debe tener capacitación en IPERC antes del inicio.
- GENERAL: No dejar herramientas ni materiales sueltos en altura.`,
    schema: `{ "restricciones": [{ "texto": "string descriptivo de la restricción", "categoria": "GENERAL" }] }`,
  },

  personalAsignado: {
    instruccion: `Listá únicamente las personas del organigrama que tienen persona real asignada
(aparecen como "NODO [id=...]: Cargo — NombrePersona").
- siglas: iniciales del nombre y primer apellido (ej: "Yony Apaza" → "YA", "Jesus Mamani" → "JM").
- empresa: "GYS CONTROL INDUSTRIAL SAC" para personal interno.
- Incluí CIP, email y teléfono si aparecen en el contexto del organigrama.
REFERENCIAS — IDs OBLIGATORIOS:
- proyectoOrgNodoRefId: COPIA EXACTAMENTE el id= del "NODO [id=...]" del organigrama.
- Si una persona aparece en dos nodos, usá el nodo de nivel más específico.
- NO inventes IDs.`,
    schema: `{ "personalAsignado": [{ "nombre": "string", "cargo": "string", "empresa": "GYS CONTROL INDUSTRIAL SAC", "siglas": "AB", "cip": "string opcional", "email": "string opcional", "telefono": "string opcional", "proyectoOrgNodoRefId": "cuid-exacto-del-contexto" }] }`,
  },

  matrizRaci: {
    instruccion: `Generá una fila por cada EDT del cronograma de planificación.
Reglas de asignación de roles (R=Responsable, A=Aprobador, C=Consultado, I=Informado):
- Gerente General o Gerente de Proyectos: A en todos los EDTs.
- Supervisor de Proyecto / Residente / Ing. Programador: R en actividades operativas de su especialidad.
- Técnicos: R en su área técnica.
- Supervisor de Seguridad (HSEQ): C en todos los EDTs operativos.
- Usá las siglas del personal del "Estado actual del plan" (sección personalAsignado) si ya existe.
  Si no, calculá siglas desde el organigrama del contexto.`,
    schema: `{ "matrizRaci": { "filas": [{ "edt": "Nombre del EDT exactamente como en el cronograma", "asignaciones": [{ "siglas": "AB", "rol": "R" }] }] } }`,
  },

  histogramas: {
    instruccion: `Usá EXCLUSIVAMENTE los datos del "RESUMEN NUMÉRICO PARA HISTOGRAMAS Y CRONOGRAMA" del contexto.
A) "meses": array de strings "YYYY-MM" generado a partir del "Rango de fechas del cronograma (EDTs)".
   NO uses el rango del proyecto completo — usá solo el rango de los EDTs.
   Ejemplo: si el rango es 2026-02-03 a 2026-02-17, los meses son ["2026-02"].
B) "equipoTrabajo": una fila por persona que aparece en las tareas del cronograma.
   El valor por mes es la cantidad de personas (personasEstimadas) en sus tareas de ese mes.
C) "horasHombre": una fila por persona o EDT.
   El valor por mes es la suma de (horasEstimadas × personasEstimadas) de las tareas en ese mes.
   La suma de TODOS los "total" debe coincidir (±5%) con el "Total HH" del resumen numérico.
Si los datos son insuficientes, devolvé { meses: [], equipoTrabajo: [], horasHombre: [] }.`,
    schema: `{ "histogramas": { "meses": ["2026-02"], "equipoTrabajo": [{ "etiqueta": "string", "valoresPorMes": [1], "total": 1 }], "horasHombre": [{ "etiqueta": "string", "valoresPorMes": [76], "total": 76 }] } }`,
  },

  cronogramaResumen: {
    instruccion: `Generá una fila por actividad del cronograma de planificación.
- Usá las fechas EXACTAS de la sección "CRONOGRAMA DE PLANIFICACIÓN" del contexto.
- fechaInicio / fechaFin: tomá las fechas de la Actividad; si no tiene, usá las del EDT padre.
- horasPlan: horas planificadas del EDT o de la actividad.
- Si una actividad o EDT tiene "(sin fecha)", omitila del resumen.
- NO uses la fecha de inicio del proyecto como fallback.
- Si hay actividades sin sub-tareas igualmente generá la fila con las fechas del EDT padre.`,
    schema: `{ "cronogramaResumen": { "filas": [{ "fase": "string", "edt": "string", "actividad": "string opcional", "fechaInicio": "YYYY-MM-DD", "fechaFin": "YYYY-MM-DD", "horasPlan": 0 }] } }`,
  },

  responsabilidades: {
    instruccion: `Generá las responsabilidades de cada rol adaptadas al tipo de proyecto:
- gerenteGeneral: 3-5 responsabilidades ejecutivas (planificación estratégica, aprobación del plan,
  asignación de recursos, relación contractual con el cliente).
- supervisor: 4-6 responsabilidades operativas (ejecución técnica, control de calidad,
  reportes de avance, coordinación con el cliente, cumplimiento del cronograma).
- operario: 3-5 responsabilidades de cumplimiento (seguimiento de procedimientos, uso correcto
  de EPP, reporte de condiciones inseguras, mantenimiento del área de trabajo).
- supervisorSeguridad: 4-6 responsabilidades SSOMA (implementación del SGSST, elaboración de
  ART/IPERC, permisos de trabajo PETAR, capacitaciones, investigación de incidentes).`,
    schema: `{ "responsabilidades": { "gerenteGeneral": ["string"], "supervisor": ["string"], "operario": ["string"], "supervisorSeguridad": ["string"] } }`,
  },

  referencias: {
    instruccion: `Generá la lista de documentos y normas de referencia aplicables al proyecto:
- Si existe TDR, incluí los documentos contractuales mencionados en él (orden de compra, contrato,
  especificaciones técnicas del cliente).
- Siempre incluí la normativa peruana SSOMA: Ley N° 29783, DS-005-2012-TR, RM 050-2013-TR.
- Si el TDR menciona normas técnicas específicas (IEC, NTP, IEEE, NFPA, OSHA), incluilas.
- origen: "TDR" para documentos del TDR, "NORMATIVA" para leyes/normas técnicas,
  "COTIZACION" si viene de la cotización, "MANUAL" para manuales de fabricantes.`,
    schema: `{ "referencias": [{ "codigoDocumento": "string opcional", "titulo": "string", "origen": "NORMATIVA" }] }`,
  },
}

export function buildPromptRegeneracion(
  seccion: SeccionRegenerable,
  instruccionesAdicionales?: string
): string {
  const config = CONFIGS[seccion]

  const lines: string[] = [
    `Eres el Ingeniero de Seguridad Senior de GYS CONTROL INDUSTRIAL SAC,`,
    `empresa peruana especializada en proyectos electromecánicos, automatización e instrumentación.`,
    ``,
    `Tu tarea es regenerar ÚNICAMENTE la sección "${seccion}" del Plan de Trabajo.`,
    `Recibirás: (1) el resumen ejecutivo del proyecto generado por IA, (2) el estado actual del plan.`,
    `Solo generás la sección indicada — no repetís ni modificás las demás.`,
    ``,
    `INSTRUCCIONES PARA LA SECCIÓN "${seccion.toUpperCase()}":`,
    config.instruccion,
  ]

  if (instruccionesAdicionales) {
    lines.push(``)
    lines.push(`INSTRUCCIONES ADICIONALES DEL USUARIO:`)
    lines.push(instruccionesAdicionales)
  }

  lines.push(``)
  lines.push(`ESQUEMA JSON DE OUTPUT (devolvé SOLO este JSON, sin markdown, sin texto adicional):`)
  lines.push(config.schema)
  lines.push(``)
  lines.push(`ANTI-ALUCINACIÓN:`)
  lines.push(`- Si un dato no está en el contexto, NO LO INVENTES.`)
  lines.push(`- Los IDs (servicioCotizadoRefId, edtRefId, proyectoOrgNodoRefId) deben copiarse`)
  lines.push(`  EXACTAMENTE del contexto — nunca inventarlos ni dejarlos como placeholder.`)
  lines.push(`- Si los datos son insuficientes para una sección estructurada, usá array vacío [].`)
  lines.push(``)
  lines.push(`REGLAS GENERALES:`)
  lines.push(`- Devolvé SOLO el JSON con la clave "${seccion}", sin otras claves.`)
  lines.push(`- NUNCA uses null en campos requeridos — usá string vacío "" o array vacío [].`)
  lines.push(`- Lenguaje técnico de ingeniería peruana, formal y claro.`)

  return lines.join('\n')
}
