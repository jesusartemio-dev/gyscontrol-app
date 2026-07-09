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
     si no hay ubicación real, no menciones ninguna. Si mencionás horas por
     fase, usá EXACTAMENTE los valores de "HORAS-HOMBRE POR FASE" del bloque
     de hechos — no inventes otra distribución.

NOTA: "alcanceDetallado" NO se genera con este prompt — el servidor arma su
estructura completa (numeración, EDTs, subItems, personalRequerido) y la IA
solo redacta descripciones en un flujo separado, ver
src/lib/planTrabajo/generarAlcanceDetallado.ts y
src/lib/planTrabajo/prompts/alcanceDetallado.ts.

2. EPP:
   - basico: casco ANSI Z89.1-2014, lentes Z87+, zapatos dieléctricos, guantes, chaleco.
   - bioseguridad: mascarilla KN95, guantes nitrilo, alcohol gel — solo si aplica.
   - riesgoEspecifico: arnés + línea de vida si hay altura; traje contra arco si hay
     trabajo eléctrico de alta tensión; respirador si hay productos químicos.
   - Incluí norma cuando sea conocida.

3. HERRAMIENTAS Y EQUIPOS:
   - equipos: maquinaria mayor (manlift, esmeril angular, taladro, roscadora, compresor).
   - herramientas: manuales (destornilladores, llaves, alicates, wincha, nivel).
   - materiales: consumibles (cintillos, cinta aislante, conduit, cable, pernos).
   - Usá cantidades cuando se infieren de la cotización.

4. RESTRICCIONES:
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
