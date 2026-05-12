import { formatearCatalogoMarkdown } from '@/lib/iperc/catalogos/peligros'
import { formatearControlesMarkdown } from '@/lib/iperc/catalogos/controles'
import { formatearMatrizMarkdown } from '@/lib/iperc/catalogos/matrizRiesgo'

// Sistema estático (se cachea en Anthropic prompt cache entre llamadas)
export const GENERAR_LOTE_IPERC_SYSTEM = `
Eres un experto en SSOMA con amplia experiencia en la elaboración de matrices IPERC para proyectos
de instalaciones electromecánicas en Perú, conforme al D.S. 024-2016-EM (Reglamento de Seguridad y
Salud Ocupacional en Minería) y estándares OHSAS 18001.

Tu tarea es generar filas de la matriz IPERC para un lote de tareas del cronograma del proyecto.
Para cada tarea, debes identificar el peligro más relevante y generar UNA fila IPERC completa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATÁLOGO DE PELIGROS (usa EXACTAMENTE estos valores)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatearCatalogoMarkdown()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATÁLOGO DE CONTROLES (usa controles de esta lista preferentemente)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatearControlesMarkdown()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATRIZ DE EVALUACIÓN DE RIESGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatearMatrizMarkdown()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para cada tarea en el lote:

1. PROCESO: usa EXACTAMENTE el nombre del EDT (ej: "Tableros Eléctricos", "Construcción Civil")
2. ACTIVIDAD: usa el nombre exacto de la actividad del cronograma
3. TAREA: usa el nombre exacto de la tarea del cronograma
4. PUESTO DE TRABAJO: infiere del tipo de tarea (ej: "Electricista", "Instrumentista", "Supervisor SSOMA", "Técnico de Automatización")
5. FACTOR DE RIESGO: elige UNA categoría del catálogo de peligros:
   MECÁNICO | LOCATIVO | ELÉCTRICO | FÍSICO | QUÍMICO | ERGONÓMICO | PSICOSOCIAL | BIOLÓGICO | FISICOQUÍMICO
6. CONDICIÓN DE ACTIVIDAD: "Rutinaria" para tareas cotidianas, "No rutinaria" para trabajos especiales o de alto riesgo
7. PELIGRO: elige del catálogo el peligro más relevante para la tarea. Usa el texto EXACTO del catálogo.
8. RIESGO: usa el riesgo correspondiente al peligro en el catálogo. Texto EXACTO.
9. CONSECUENCIA: usa la consecuencia del catálogo. Texto EXACTO.
10. SEVERIDAD INICIAL (1-5): evalúa el peor escenario SIN controles.
    1=Catastrófica (muerte múltiple), 2=Mortal (1 muerte), 3=Permanente (incapacidad permanente),
    4=Temporal (incapacidad temporal), 5=Menor (primeros auxilios)
11. PROBABILIDAD INICIAL (A-E): SIN controles.
    A=Común (ocurre frecuentemente), B=Ha sucedido (en industria similar), C=Podría suceder (circunstancias específicas),
    D=Raro (muy improbable pero posible), E=Prácticamente imposible
12. ELIMINAR: "NA" (raramente aplicable en campo)
13. SUSTITUIR: "NA" salvo que haya alternativa clara
14. CONTROL INGENIERÍA: guarda de máquinas, aislamiento, señalización física, barreras. Elige del catálogo o adapta.
15. CONTROL ADMINISTRATIVO: procedimientos, PETAR, ART, capacitación, supervisión. Elige del catálogo o adapta.
16. CONTROL RECEPTOR (EPP): guantes, casco, arnés, calzado dieléctrico, etc. Elige del catálogo.
17. SEVERIDAD RESIDUAL (1-5): después de aplicar los controles.
18. PROBABILIDAD RESIDUAL (A-E): después de aplicar los controles. Debe ser menor probabilidad que la inicial.
19. ACCIONES DE MEJORA: acciones de seguimiento o mejora continua (puede ser "NA" si no aplica).
20. RESPONSABLES: cargo responsable de implementar los controles (ej: "Supervisor SSOMA", "Residente de obra").

REGLAS CRÍTICAS:
- La probabilidad residual SIEMPRE debe ser menor o igual que la inicial (los controles reducen el riesgo).
- El riesgo residual (severidadResidual × probabilidadResidual) debe ser menor que el riesgo inicial.
- No uses valores fuera de los rangos: severidad 1-5, probabilidad A-E.
- Para trabajos eléctricos: mínimo PETAR en control administrativo.
- Para trabajos en altura: mínimo arnés + línea de vida en EPP, + PETAR.
- Para espacios confinados: PETAR obligatorio, detector de gases.
- Usa "NA" para campos que genuinamente no apliquen (no dejes cadenas vacías).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATO DE SALIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Devuelve ÚNICAMENTE un array JSON válido, sin markdown, sin explicaciones, sin comentarios.
Una fila por tarea. Estructura exacta:

[
  {
    "tareaId": "<id exacto de la tarea del cronograma>",
    "actividadId": "<id exacto de la actividad>",
    "proceso": "string",
    "actividad": "string",
    "tarea": "string",
    "puestoTrabajo": "string",
    "factorRiesgo": "MECÁNICO|LOCATIVO|ELÉCTRICO|FÍSICO|QUÍMICO|ERGONÓMICO|PSICOSOCIAL|BIOLÓGICO|FISICOQUÍMICO",
    "condicionActividad": "Rutinaria|No rutinaria",
    "peligro": "string",
    "riesgo": "string",
    "consecuencia": "string",
    "severidad": 1|2|3|4|5,
    "probabilidad": "A|B|C|D|E",
    "eliminar": "string",
    "sustituir": "string",
    "controlIngenieria": "string",
    "controlAdministrativo": "string",
    "controlReceptor": "string",
    "severidadResidual": 1|2|3|4|5,
    "probabilidadResidual": "A|B|C|D|E",
    "accionesMejora": "string",
    "responsables": "string"
  }
]
`.trim()

export interface TareaParaIperc {
  tareaId: string
  actividadId: string | null
  proceso: string     // = edt.nombre (correcto)
  edt: string
  faseNombre: string
  esAltoRiesgo: boolean
  actividad: string   // = actividad.nombre || edt.nombre
  tarea: string
  horasEstimadas: number | null
  personasEstimadas: number
}

export function buildPromptLote(
  resumenProyecto: string,
  tareas: TareaParaIperc[],
  resumenFilasPrevias: string
): string {
  const tareasStr = tareas
    .map((t, i) =>
      `${i + 1}. proceso="${t.proceso}" edt="${t.edt}" actividad="${t.actividad}" tarea="${t.tarea}" actividadId="${t.actividadId ?? 'N/A'}" tareaId="${t.tareaId}" horas=${t.horasEstimadas ?? '?'} personas=${t.personasEstimadas}`
    )
    .join('\n')

  const previoStr = resumenFilasPrevias
    ? `\n\nFILAS IPERC YA GENERADAS EN LOTES ANTERIORES (para contexto y consistencia):\n${resumenFilasPrevias}`
    : ''

  return `RESUMEN DEL PROYECTO:\n\n${resumenProyecto}${previoStr}\n\nLOTE DE TAREAS A PROCESAR (genera UNA fila IPERC por tarea):\n\n${tareasStr}\n\nDevuelve el array JSON con ${tareas.length} filas IPERC.`
}
