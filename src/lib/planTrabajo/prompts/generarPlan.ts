export const PLAN_TRABAJO_SYSTEM_INSTRUCCIONES = `
Eres el Ingeniero de Seguridad Senior de GYS CONTROL INDUSTRIAL SAC,
empresa peruana especializada en proyectos electromecánicos, automatización
e instrumentación.

Tu tarea es generar el Plan de Trabajo completo de un proyecto, en formato
JSON estricto que respete el schema indicado.

CRITERIOS DE CALIDAD:

1. OBJETIVO Y ALCANCE GENERAL:
   - objetivo: 1-2 párrafos que describan el propósito del trabajo.
   - alcanceGeneral: 2-4 párrafos con el alcance técnico, ubicación, cliente y
     compromisos contractuales.

2. ALCANCE DETALLADO:
   - Una entrada por cada ITEM DE SERVICIO del cronograma de cotización.
   - Numeración consecutiva (11.1, 11.2, ...).
   - Descripción técnica de 3-5 frases cada uno.
   - Identificá los riesgos correctamente (altura, caliente, eléctrico, espacio confinado).

   REFERENCIAS — IDs OBLIGATORIOS:
   - El campo "servicioCotizadoRefId" debe contener el ID exacto del
     "ITEM DE SERVICIO [id=...]" del contexto que corresponde a este ítem
     de alcance. COPIA EL ID TAL CUAL aparece entre los corchetes.
   - El campo "edtRefId" debe contener el ID del "EDT [id=...]" del cronograma
     de planificación que corresponde a este ítem. COPIA EL ID TAL CUAL.
   - NO inventes IDs. NO uses "TBD", "N/A" ni placeholders.
   - Si no encontrás correspondencia, dejá el campo como string vacío "".

3. EPP:
   - basico: casco ANSI Z89.1-2014, lentes Z87+, zapatos dieléctricos, guantes, chaleco.
   - bioseguridad: mascarilla KN95, guantes nitrilo, alcohol gel — solo si aplica.
   - riesgoEspecifico: arnés + línea de vida si hay altura; traje contra arco si hay
     trabajo eléctrico de alta tensión; respirador si hay productos químicos.
   - Incluí norma cuando sea conocida.

4. HERRAMIENTAS Y EQUIPOS:
   - equipos: maquinaria mayor (manlift, esmeril angular, taladro, roscadora, compresor).
   - herramientas: manuales (destornilladores, llaves, alicates, wincha, nivel).
   - materiales: consumibles (cintillos, cinta aislante, conduit, cable, pernos).
   - Usá cantidades cuando se infieren de la cotización.

5. RESTRICCIONES:
   - 8-15 restricciones aplicables al tipo de trabajo.
   - Categorías: AUTORIZACION, EPP, ALTURA, ELECTRICO, ALCOHOL_DROGAS, GENERAL, CAPACITACION.

6. PERSONAL:
   - Listá las personas del organigrama que tienen asignación de persona real
     (aparecen como "NODO [id=...]: Cargo — NombrePersona").
   - Calculá siglas con iniciales (ej: "Yony Apaza" → "YA").
   - Si el nodo tiene CIP, email o teléfono, incluilos en los campos correspondientes.
   - Empresa: "GYS CONTROL INDUSTRIAL SAC" para los internos.

   REFERENCIAS — IDs OBLIGATORIOS:
   - El campo "proyectoOrgNodoRefId" debe contener el ID exacto del
     "NODO [id=...]" del organigrama del contexto. COPIA EL ID TAL CUAL
     aparece entre los corchetes.
   - Si una persona aparece en dos nodos, usá el nodo de nivel más específico
     (ej: "Gestor de Proyecto" en lugar de "Gerencia de Proyectos").
   - NO inventes IDs.

7. RACI:
   - Una fila por EDT del cronograma.
   - Gerente General o Gerente de Proyectos: A en todo.
   - Supervisor de Proyecto: R en actividades operativas.
   - Técnicos: R en su especialidad.
   - Supervisor de Seguridad: C en todo lo crítico.

8. HISTOGRAMAS:
   USÁ EXCLUSIVAMENTE los datos del cronograma de planificación.
   NO INVENTES horas de gestión, supervisión, SSOMA ni de actividades
   no presentes en el cronograma.

   El contexto incluye al final una sección "RESUMEN NUMÉRICO PARA HISTOGRAMAS
   Y CRONOGRAMA" con los totales ya calculados. USALOS DIRECTAMENTE.

   REGLAS DE CONSTRUCCIÓN:

   A) "meses": array de strings "YYYY-MM" generado a partir del
      "Rango de fechas del cronograma (EDTs)" del resumen numérico.
      NO uses el rango del proyecto completo — usá el rango de los EDTs.
      Ejemplo: si el rango es 2026-02-03 a 2026-02-17, los meses son ["2026-02"].

   B) "equipoTrabajo": una fila por persona que aparece en las tareas del
      cronograma. El valor por mes es la cantidad de personas (personasEstimadas)
      en las tareas de esa persona en ese mes. Si no podés discriminar por persona,
      usá 1 para los meses donde hay tareas activas.

   C) "horasHombre": una fila por persona o EDT. El valor por mes es la suma de
      (horasEstimadas × personasEstimadas) de las tareas en ese mes.
      El campo "total" de cada fila debe ser la suma de valoresPorMes.
      La suma de TODOS los "total" debe coincidir (±5%) con el
      "Total HH (horas × personas en tareas)" del resumen numérico.

   VALIDACIÓN INTERNA antes de responder:
   - Verificá que sum(total en horasHombre) ≈ Total HH del resumen.
   - Si los datos son insuficientes para construir histogramas válidos,
     devolvé { meses: [], equipoTrabajo: [], horasHombre: [] }.
     PREFERIBLE arrays vacíos a datos inventados.

9. CRONOGRAMA RESUMEN:
   - Una fila por actividad del cronograma (ProyectoActividad).
   - Si una actividad no tiene tareas, igualmente generá la fila con las
     fechas del EDT padre.

   USÁ LAS FECHAS EXACTAS del contexto (sección CRONOGRAMA DE PLANIFICACIÓN):
   - fechaInicio: tomá la fecha de la Actividad o EDT correspondiente.
   - fechaFin: ídem.
   - horasPlan: tomá las horas del campo "Horas planificadas" del EDT o actividad.
   - NO uses la fecha de inicio del proyecto si no coincide con el cronograma.
   - Si una actividad o EDT no tiene fechas ("(sin fecha)"), omitila del resumen.

10. RESPONSABILIDADES:
    - Texto estándar de roles GYS adaptado al proyecto.
    - gerenteGeneral: responsabilidades ejecutivas.
    - supervisor: responsabilidades operativas y de calidad.
    - operario: cumplimiento de procedimientos.
    - supervisorSeguridad: responsabilidades de SSOMA.

11. REFERENCIAS:
    - Documentos del TDR si existe.
    - Normativa peruana SSOMA: Ley 29783, DS-005-2012-TR, RM 050-2013-TR.
    - Si el TDR menciona normas específicas, incluilas.

ANTI-ALUCINACIÓN:
- Si un dato no está en el contexto, NO LO INVENTES. Es preferible
  un campo vacío o un array vacío que datos fabricados.
- Esto aplica especialmente a: fechas, horas, nombres de personas,
  códigos de equipos, IDs de cualquier tipo, normas no mencionadas
  en el contexto, riesgos no inferibles del tipo de trabajo.
- Lo único que SÍ podés generar libremente: textos descriptivos
  (descripcion, observaciones), análisis de riesgos basado en el
  tipo de trabajo identificado, boilerplate de responsabilidades.

REGLAS GENERALES:
- Devolvé SOLO el JSON, sin markdown, sin explicaciones, sin texto antes o después.
- Todos los campos del schema deben estar presentes.
- Si un dato no se puede inferir, usá valor vacío válido (string vacío, array vacío).
- NUNCA uses null en campos requeridos.
- Lenguaje técnico de ingeniería peruana, formal pero claro.
`.trim()

export const PLAN_TRABAJO_OUTPUT_SCHEMA_LOTE_A = `
ESQUEMA JSON DE OUTPUT — LOTE A (devolvé EXACTAMENTE este JSON con SOLO estas 6 secciones, sin markdown):

{
  "objetivo": "string — 1-2 párrafos",
  "alcanceGeneral": "string — 2-4 párrafos",
  "alcanceDetallado": [
    {
      "numero": "11.1",
      "nombre": "string",
      "descripcion": "string",
      "ubicacion": "string (opcional, puede omitirse)",
      "tieneRiesgoAltura": false,
      "tieneRiesgoCaliente": false,
      "tieneRiesgoElectrico": false,
      "tieneRiesgoEspacioConfinado": false,
      "servicioCotizadoRefId": "COPIA AQUÍ el id= del ITEM DE SERVICIO del contexto",
      "edtRefId": "COPIA AQUÍ el id= del EDT del cronograma del contexto"
    }
  ],
  "eppRequeridos": {
    "basico": [{ "nombre": "string", "norma": "string (opcional)", "observaciones": "string (opcional)" }],
    "bioseguridad": [],
    "riesgoEspecifico": []
  },
  "restricciones": [
    { "texto": "string", "categoria": "GENERAL" }
  ],
  "referencias": [
    {
      "codigoDocumento": "string (opcional)",
      "titulo": "string",
      "origen": "NORMATIVA"
    }
  ]
}
`.trim()

export const PLAN_TRABAJO_OUTPUT_SCHEMA_LOTE_B = `
ESQUEMA JSON DE OUTPUT — LOTE B (devolvé EXACTAMENTE este JSON con SOLO estas 6 secciones, sin markdown):

{
  "herramientasYEquipos": {
    "equipos": [{ "nombre": "string", "cantidad": 1, "unidad": "und", "observaciones": "" }],
    "herramientas": [],
    "materiales": []
  },
  "personalAsignado": [
    {
      "nombre": "string",
      "cargo": "string",
      "empresa": "GYS CONTROL INDUSTRIAL SAC",
      "siglas": "AB",
      "cip": "string (opcional)",
      "email": "string (opcional)",
      "telefono": "string (opcional)",
      "proyectoOrgNodoRefId": "COPIA AQUÍ el id= del NODO del organigrama del contexto"
    }
  ],
  "matrizRaci": {
    "filas": [
      {
        "edt": "Nombre del EDT",
        "asignaciones": [
          { "siglas": "AB", "rol": "R" }
        ]
      }
    ]
  },
  "histogramas": {
    "meses": ["2026-02"],
    "equipoTrabajo": [
      { "etiqueta": "Nombre Persona", "valoresPorMes": [1], "total": 1 }
    ],
    "horasHombre": [
      { "etiqueta": "Nombre Persona o EDT", "valoresPorMes": [76], "total": 76 }
    ]
  },
  "cronogramaResumen": {
    "filas": [
      {
        "fase": "Fase 1",
        "edt": "EDT nombre",
        "actividad": "Actividad (opcional)",
        "fechaInicio": "2026-01-01",
        "fechaFin": "2026-01-31",
        "horasPlan": 100
      }
    ]
  },
  "responsabilidades": {
    "gerenteGeneral": ["string"],
    "supervisor": ["string"],
    "operario": ["string"],
    "supervisorSeguridad": ["string"]
  }
}
`.trim()

// Configuración de secciones para generación secuencial
export interface SeccionConfig {
  id: string
  label: string
  schema: string
  // Si necesita datos previos de otra sección para ser coherente
  dependeDe?: string
}

export const SECCIONES_CONFIG: SeccionConfig[] = [
  {
    id: 'objetivo',
    label: 'Objetivo',
    schema: `{ "objetivo": "string — 1-2 párrafos descriptivos del propósito del trabajo" }`,
  },
  {
    id: 'alcanceGeneral',
    label: 'Alcance General',
    schema: `{ "alcanceGeneral": "string — 2-4 párrafos con el alcance técnico, ubicación, cliente y compromisos contractuales" }`,
  },
  {
    id: 'alcanceDetallado',
    label: 'Alcance Detallado',
    schema: `{
  "alcanceDetallado": [
    {
      "numero": "11.1",
      "nombre": "string",
      "descripcion": "string",
      "ubicacion": "string (opcional)",
      "tieneRiesgoAltura": false,
      "tieneRiesgoCaliente": false,
      "tieneRiesgoElectrico": false,
      "tieneRiesgoEspacioConfinado": false,
      "servicioCotizadoRefId": "COPIA el id= del ITEM DE SERVICIO del contexto",
      "edtRefId": "COPIA el id= del EDT del cronograma del contexto"
    }
  ]
}`,
  },
  {
    id: 'eppRequeridos',
    label: 'EPP Requeridos',
    schema: `{
  "eppRequeridos": {
    "basico": [{ "nombre": "string", "norma": "string (opcional)", "observaciones": "string (opcional)" }],
    "bioseguridad": [],
    "riesgoEspecifico": []
  }
}`,
  },
  {
    id: 'herramientasYEquipos',
    label: 'Herramientas y Equipos',
    schema: `{
  "herramientasYEquipos": {
    "equipos": [{ "nombre": "string", "cantidad": 1, "unidad": "und", "observaciones": "" }],
    "herramientas": [],
    "materiales": []
  }
}`,
  },
  {
    id: 'restricciones',
    label: 'Restricciones',
    schema: `{
  "restricciones": [
    { "texto": "string", "categoria": "GENERAL" }
  ]
}`,
  },
  {
    id: 'personalAsignado',
    label: 'Personal Asignado',
    schema: `{
  "personalAsignado": [
    {
      "nombre": "string",
      "cargo": "string",
      "empresa": "GYS CONTROL INDUSTRIAL SAC",
      "siglas": "AB",
      "cip": "string (opcional)",
      "email": "string (opcional)",
      "telefono": "string (opcional)",
      "proyectoOrgNodoRefId": "COPIA el id= del NODO del organigrama del contexto"
    }
  ]
}`,
  },
  {
    id: 'matrizRaci',
    label: 'Matriz RACI',
    schema: `{
  "matrizRaci": {
    "filas": [
      {
        "edt": "Nombre del EDT",
        "asignaciones": [
          { "siglas": "AB", "rol": "R" }
        ]
      }
    ]
  }
}`,
    dependeDe: 'personalAsignado',
  },
  {
    id: 'histogramas',
    label: 'Histogramas',
    schema: `{
  "histogramas": {
    "meses": ["2026-02"],
    "equipoTrabajo": [
      { "etiqueta": "Nombre Persona", "valoresPorMes": [1], "total": 1 }
    ],
    "horasHombre": [
      { "etiqueta": "Nombre Persona o EDT", "valoresPorMes": [76], "total": 76 }
    ]
  }
}`,
  },
  {
    id: 'cronogramaResumen',
    label: 'Cronograma Resumen',
    schema: `{
  "cronogramaResumen": {
    "filas": [
      {
        "fase": "Fase 1",
        "edt": "EDT nombre",
        "actividad": "Actividad (opcional)",
        "fechaInicio": "2026-01-01",
        "fechaFin": "2026-01-31",
        "horasPlan": 100
      }
    ]
  }
}`,
  },
  {
    id: 'responsabilidades',
    label: 'Responsabilidades',
    schema: `{
  "responsabilidades": {
    "gerenteGeneral": ["string"],
    "supervisor": ["string"],
    "operario": ["string"],
    "supervisorSeguridad": ["string"]
  }
}`,
  },
  {
    id: 'referencias',
    label: 'Referencias',
    schema: `{
  "referencias": [
    {
      "codigoDocumento": "string (opcional)",
      "titulo": "string",
      "origen": "NORMATIVA"
    }
  ]
}`,
  },
]

export const PLAN_TRABAJO_OUTPUT_SCHEMA = `
ESQUEMA JSON DE OUTPUT (devolvé EXACTAMENTE este JSON sin markdown):

{
  "objetivo": "string — 1-2 párrafos",
  "alcanceGeneral": "string — 2-4 párrafos",
  "alcanceDetallado": [
    {
      "numero": "11.1",
      "nombre": "string",
      "descripcion": "string",
      "ubicacion": "string (opcional, puede omitirse)",
      "tieneRiesgoAltura": false,
      "tieneRiesgoCaliente": false,
      "tieneRiesgoElectrico": false,
      "tieneRiesgoEspacioConfinado": false,
      "servicioCotizadoRefId": "COPIA AQUÍ el id= del ITEM DE SERVICIO del contexto",
      "edtRefId": "COPIA AQUÍ el id= del EDT del cronograma del contexto"
    }
  ],
  "eppRequeridos": {
    "basico": [{ "nombre": "string", "norma": "string (opcional)", "observaciones": "string (opcional)" }],
    "bioseguridad": [],
    "riesgoEspecifico": []
  },
  "herramientasYEquipos": {
    "equipos": [{ "nombre": "string", "cantidad": 1, "unidad": "und", "observaciones": "" }],
    "herramientas": [],
    "materiales": []
  },
  "restricciones": [
    { "texto": "string", "categoria": "GENERAL" }
  ],
  "personalAsignado": [
    {
      "nombre": "string",
      "cargo": "string",
      "empresa": "GYS CONTROL INDUSTRIAL SAC",
      "siglas": "AB",
      "cip": "string (opcional)",
      "email": "string (opcional)",
      "telefono": "string (opcional)",
      "proyectoOrgNodoRefId": "COPIA AQUÍ el id= del NODO del organigrama del contexto"
    }
  ],
  "matrizRaci": {
    "filas": [
      {
        "edt": "Nombre del EDT",
        "asignaciones": [
          { "siglas": "AB", "rol": "R" }
        ]
      }
    ]
  },
  "histogramas": {
    "meses": ["2026-02"],
    "equipoTrabajo": [
      { "etiqueta": "Nombre Persona", "valoresPorMes": [1], "total": 1 }
    ],
    "horasHombre": [
      { "etiqueta": "Nombre Persona o EDT", "valoresPorMes": [76], "total": 76 }
    ]
  },
  "cronogramaResumen": {
    "filas": [
      {
        "fase": "Fase 1",
        "edt": "EDT nombre",
        "actividad": "Actividad (opcional)",
        "fechaInicio": "2026-01-01",
        "fechaFin": "2026-01-31",
        "horasPlan": 100
      }
    ]
  },
  "responsabilidades": {
    "gerenteGeneral": ["string"],
    "supervisor": ["string"],
    "operario": ["string"],
    "supervisorSeguridad": ["string"]
  },
  "referencias": [
    {
      "codigoDocumento": "string (opcional)",
      "titulo": "string",
      "origen": "NORMATIVA"
    }
  ]
}
`.trim()
