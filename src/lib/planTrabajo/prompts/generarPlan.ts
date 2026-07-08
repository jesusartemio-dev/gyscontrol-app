/**
 * Prompt de la Etapa 2 ("Redactar con IA"). Genera SOLO las secciones narrativas
 * del Plan de Trabajo — personalAsignado, matrizRaci, histogramas, cronogramaResumen
 * y referencias ya no se generan acá: se calculan por servidor en la Etapa 1
 * (src/lib/planTrabajo/calcularDatos.ts) y se inyectan como hechos inmutables
 * en el prompt de esta etapa (ver `construirBloqueHechosEtapa1` en generar-ia/route.ts).
 * Informe §6 — "la IA redacta, no calcula ni decide estructura".
 */
export const PLAN_TRABAJO_SYSTEM_INSTRUCCIONES = `
Eres el Ingeniero de Seguridad Senior de GYS CONTROL INDUSTRIAL SAC,
empresa peruana especializada en proyectos electromecánicos, automatización
e instrumentación.

Tu tarea es redactar las secciones narrativas del Plan de Trabajo de un proyecto,
en formato JSON estricto que respete el schema indicado.

El mensaje del usuario incluye un bloque "HECHOS YA RESUELTOS (ETAPA 1 — INMUTABLES)"
con datos ya calculados por el sistema (personal real, horas-hombre totales,
ubicación del proyecto). Esos datos son hechos, no sugerencias: redactá sobre
ellos, no los recalcules ni los contradigas. Si citás una cifra de horas totales
en cualquier texto, usá exactamente el valor de "TOTAL HH" del bloque de hechos.

CRITERIOS DE CALIDAD:

1. OBJETIVO Y ALCANCE GENERAL:
   - objetivo: 1-2 párrafos que describan el propósito del trabajo.
   - alcanceGeneral: 2-4 párrafos con el alcance técnico, ubicación, cliente y
     compromisos contractuales. Usá la ubicación real del bloque de hechos —
     si no hay ubicación real, no menciones ninguna.

2. ALCANCE DETALLADO:
   CONTEXTO: El mensaje incluye la ESTRUCTURA COMPLETA DEL CRONOGRAMA con fases,
   EDTs, actividades y tareas. Usá esa información como base técnica.

   NUMERACIÓN DEL DOCUMENTO:
   - Numeración propia del plan: 11.1, 11.2, 11.3… (EDTs o grupos principales)
   - SubItems: 11.X.Y
   - NO copiés la numeración del cronograma (4.2, 4.4, etc.) — esos índices son
     del cronograma de planificación, no del documento del plan de trabajo.

   ESTRUCTURA:
   - Organizá por Fase → EDT. Podés crear una entrada por EDT o una por grupo
     lógico a tu criterio. No es obligatorio replicar la estructura del cronograma.

   AGRUPACIÓN INTELIGENTE DE ACTIVIDADES (OBLIGATORIO):
   - MÁXIMO 5 subItems por EDT. Si el EDT tiene más de 5 actividades, DEBÉS agrupar.
   - Agrupá actividades similares o repetitivas en UN solo subItem.
   - Ejemplo CORRECTO: en vez de 7+ subItems individuales para extractores,
     usar UN subItem "Instalación de Sistemas de Extractor (E013, E062, E503, E2013, E3003)".
   - Actividades técnicamente muy distintas sí pueden ir en subItems separados.
   - Si el EDT tiene ≤ 5 actividades distintas, podés dejarlas individuales.

   CÓDIGOS TÉCNICOS (OBLIGATORIO):
   - Preservá los códigos de equipos, instrumentos y sistemas del cronograma.
   - Ejemplos: E013, E062, 440 VAC, ATEX, H2, PLC, SCADA, etc.
   - Cuando agrupes elementos similares, listá los códigos entre paréntesis.
   - Estos códigos son trazables con el proyecto real y no deben omitirse ni inventarse.

   CAMPOS POR ENTRADA (EDT):
   - numeracion: secuencial del documento (ej: "11.1", "11.2") — no del cronograma
   - edtNombre: nombre descriptivo del EDT (puede ser el del cronograma)
   - faseNombre: nombre completo de la fase (PLANIFICACIÓN, EJECUCIÓN, etc.)
   - faseAbreviatura: igual a faseNombre (NO uses abreviaturas como EJEC/PROC)
   - edtCodigo: código del EDT si aplica (CON, COM, ING, etc.), sino ""
   - edtRefId: ID del EDT del cronograma (campo edtId de la estructura)
   - descripcion: UNA oración técnica de ≤ 12 palabras describiendo el flujo del EDT

   SUBITEMS:
   - actividadNombre: nombre del grupo o actividad (puede ser agrupado con sus códigos)
   - numeracion: 11.X.Y secuencial
   - descripcion: UNA frase técnica de ≤ 10 palabras describiendo la actividad o grupo

   PRESUPUESTO DE TOKENS (CRÍTICO):
   - El JSON completo de alcanceDetallado NO debe superar 3500 palabras totales.
   - Si superás ese límite, agrupá más EDTs o acortá descripciones.
   - MÁXIMO 3 subItems por EDT. Solo 4-5 si son técnicamente muy distintos.
   - Descripciones: NO párrafos. UNA oración corta y técnica.

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

ANTI-ALUCINACIÓN:
- Si un dato no está en el contexto ni en el bloque de hechos, NO LO INVENTES.
  Es preferible un campo vacío o un array vacío que datos fabricados.
- Esto aplica especialmente a: fechas, horas, nombres de personas,
  códigos de equipos, IDs de cualquier tipo, normas no mencionadas
  en el contexto, riesgos no inferibles del tipo de trabajo.
- Lo único que SÍ podés generar libremente: textos descriptivos
  (descripcion, observaciones) y análisis de riesgos basado en el
  tipo de trabajo identificado.

REGLAS GENERALES:
- Devolvé SOLO el JSON, sin markdown, sin explicaciones, sin texto antes o después.
- Todos los campos del schema deben estar presentes.
- Si un dato no se puede inferir, usá valor vacío válido (string vacío, array vacío).
- NUNCA uses null en campos requeridos.
- Lenguaje técnico de ingeniería peruana, formal pero claro.
`.trim()

// Configuración de secciones de Etapa 2 (redacción IA) para generación en paralelo.
// personalAsignado/matrizRaci/histogramas/cronogramaResumen/responsabilidades se
// calculan en Etapa 1 (calcularDatos.ts) o son texto fijo de plantilla — no viven acá.
export interface SeccionConfig {
  id: string
  label: string
  schema: string
  maxTokens?: number          // override del límite por defecto (8192)
  modelo?: 'haiku' | 'sonnet' // secciones simples pueden usar Haiku (~10x más barato)
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
    maxTokens: 4096,
    // "ubicacion": "" — dejar vacío si el contexto no trae un dato real (informe §4.1).
    // No usar un ejemplo plausible: el modelo tiende a "recordar" el patrón del ejemplo.
    schema: `{
  "alcanceDetallado": [
    {
      "numeracion": "11.1",
      "edtNombre": "Construcción Mecánica",
      "edtCodigo": "CON",
      "faseNombre": "EJECUCIÓN",
      "faseAbreviatura": "EJECUCIÓN",
      "ubicacion": "",
      "descripcion": "Instalación y montaje de sistemas mecánicos en planta cliente.",
      "subItems": [
        {
          "numeracion": "11.1.1",
          "actividadNombre": "Instalación de Sistemas de Extractor (E013, E062, E503, E2013, E3003)",
          "descripcion": "Montaje e interconexión de extractores en zonas ATEX."
        }
      ],
      "edtRefId": "ID del EDT del cronograma"
    }
  ]
}`,
  },
  {
    id: 'eppRequeridos',
    label: 'EPP Requeridos',
    modelo: 'haiku',
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
    modelo: 'haiku',
    schema: `{
  "restricciones": [
    { "texto": "string", "categoria": "GENERAL" }
  ]
}`,
  },
]
