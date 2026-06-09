/**
 * mapping.ts — Mapa celda → dato del Reporte Semanal de Avance.
 *
 * Coordenadas VERIFICADAS contra el Excel de muestra (RS-...SEM_05.xlsx).
 * Lo consume el generador (excelAvanceGenerator) para escribir sobre la plantilla
 * `template/reporte-semanal-avance.template.xlsx`.
 *
 * Convenciones:
 *  - Celdas de FECHA (hitos F/G/H, fechaCorte): escribir un `Date` de JS; la plantilla
 *    ya trae el formato de fecha, ExcelJS lo respeta. NO escribir string.
 *  - Celdas de PORCENTAJE (resumen G..K): la plantilla está formateada como %, así que
 *    escribir la FRACCIÓN (0.11 = 11%), no el entero 11.
 *  - Las fases del resumen/variaciones (col C, filas 41-46 / 56-61) y los nombres de
 *    hito se escriben como texto; los labels de sección/encabezado YA están en la
 *    plantilla y no se tocan.
 *
 * Cobertura por fase del roadmap:
 *  - FASE 1 (ahora): Datos, cabecera Reporte, hitos, fotos, impedimentos, y SOLO la
 *    columna "% Avance Real Acumulado" del resumen + la causa de variación (texto).
 *  - FASE 2: columnas % programado/semanal/variación numérica del resumen y de
 *    variaciones (requieren SnapshotAvanceSemanal), hoja Avance, Curva S e Histograma.
 */

// ───────────────────────── HOJA "Datos" ─────────────────────────
// (solo celdas variables; labels y datos constantes de la empresa quedan en la plantilla)
export const CELDAS_DATOS: Record<string, (a: AggView) => unknown> = {
  'E7':  (a) => a.cabecera.proyecto.nombre,
  'E8':  (a) => a.cabecera.proyecto.ubicacion ?? '',        // si no hay campo ubicacion, queda vacío
  'E9':  (a) => a.cabecera.cliente?.nombre ?? '',
  'E13': (a) => a.cabecera.proyecto.numeroContrato ?? '',   // Subcontrato / OC
  'E14': (a) => a.cabecera.proyecto.codigo,                 // Código PEP
  'E21': (a) => a.cabecera.fechaCorte,                      // Date
  'E23': (a) => a.cabecera.nombreArchivo.replace(/\.xlsx$/i, ''),
}

// ───────────────────────── HOJA "Reporte" — escalares ─────────────────────────
export const CELDAS_REPORTE: Record<string, (a: AggView) => unknown> = {
  'E1': (a) => `REPORTE SEMANAL N° ${String(a.cabecera.numero ?? 0).padStart(4, '0')}`,
  'E2': (a) => a.cabecera.proyecto.nombre,
  'G3': (a) => a.cabecera.proyecto.numeroContrato ?? '',
  'G5': (a) => a.cabecera.fechaCorte,                       // Date (fecha de corte de esta semana)
  'H5': (a) => a.cabecera.fechaCorteAnterior ?? null,       // Date (corte semana previa; opcional)
  'C9': (a) => a.reporte.alcanceTexto ?? a.cabecera.proyecto.descripcion ?? '',
}

// ───────────────────────── Bloque HITOS (sección 2) ─────────────────────────
// Filas fijas por tipo. Columnas: C=nombre, F=fechaPlan, G=fechaPronostico, H=fechaReal,
// I=variacion(días), J=comentario.
export const HITOS = {
  columnas: { nombre: 'C', plan: 'F', pronostico: 'G', real: 'H', variacion: 'I', comentario: 'J' },
  filasContractuales: [18, 19],                 // 2 espacios
  filasIntermedios: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35], // 14 espacios
  // variacion (días) = (fechaReal ?? fechaPronostico) - fechaPlan, en días. Si falta, dejar vacío.
} as const

// ───────────────────── Bloque RESUMEN DE AVANCE (sección 3) ─────────────────────
// 6 filas FIJAS (5 fases estándar + total PROYECTO). El generador hace match por nombre
// de fase (normalizado) contra avancePorFase; si no hay match, deja la fila como está.
// FASE 1: solo se escribe "% Avance Real Acumulado" (col J) = porcentajeAvance/100.
// FASE 2: G (prog semanal), H (real semanal), I (prog acumulado), K (variación).
export const RESUMEN_FASES = {
  columnas: {
    progSemanal: 'G', realSemanal: 'H', progAcumulado: 'I', realAcumulado: 'J', variacion: 'K',
  },
  filasPorFase: { // nombre normalizado (UPPER, sin tildes) -> fila
    PLANIFICACION: 41, INGENIERIA: 42, PROCURA: 43, EJECUCION: 44, CIERRE: 45, PROYECTO: 46,
  },
} as const

// ───────────────────── Bloque VARIACIONES (sección 4) ─────────────────────
// 6 filas FIJAS. C=fase (label en plantilla), E=variación numérica (FASE 2), F=causa (FASE 1).
export const VARIACIONES = {
  columnas: { variacion: 'E', causa: 'F' },
  filasPorFase: {
    PLANIFICACION: 56, INGENIERIA: 57, PROCURA: 58, EJECUCION: 59, CIERRE: 60, PROYECTO: 61,
  },
} as const

// ───────────────────── REPORTE FOTOGRÁFICO (sección 5) ─────────────────────
// Rejilla 4×2 = 8 espacios (fotos de la fase de EJECUCIÓN). Cada slot: celda de leyenda
// (texto) + rango ancla de imagen (ExcelJS worksheet.addImage(imageId, anchorRange)).
// Las columnas tienen anchos desiguales (heredados de las tablas de arriba), así que las
// fotos saldrán de tamaños algo distintos — aceptado por simplicidad (Opción B).
// Si hay más de 8 fotos con incluirEnReporte, v1 toma las primeras 8 (por orden).
// El generador debería rellenar de izq→der, fila 1 antes que fila 2, y dejar vacíos los
// slots sobrantes (no escribir leyenda ni imagen).
export const FOTOS_SLOTS = [
  // Fila 1 (leyendas en fila 71, imágenes filas 72-80)
  { leyendaCelda: 'C71', anchorImagen: 'C72:E80' },
  { leyendaCelda: 'F71', anchorImagen: 'F72:H80' },
  { leyendaCelda: 'I71', anchorImagen: 'I72:K80' },
  { leyendaCelda: 'L71', anchorImagen: 'L72:O80' },
  // Fila 2 (leyendas en fila 82, imágenes filas 83-92)
  { leyendaCelda: 'C82', anchorImagen: 'C83:E92' },
  { leyendaCelda: 'F82', anchorImagen: 'F83:H92' },
  { leyendaCelda: 'I82', anchorImagen: 'I83:K92' },
  { leyendaCelda: 'L82', anchorImagen: 'L83:O92' },
] as const

// ───────────────────── Bloque IMPEDIMENTOS / RIESGOS (sección 7) ─────────────────────
// 8 filas (98-105). C=restricción (C{r}:L{r} merged), M=responsable (M{r}:N{r}), O=fechaLimite.
export const IMPEDIMENTOS = {
  columnas: { restriccion: 'C', responsable: 'M', fechaLimite: 'O' },
  filas: [98, 99, 100, 101, 102, 103, 104, 105], // 8 espacios
} as const

// ─────────────────────────────────────────────────────────────────
// Tipo mínimo que el generador pasa al mapping. Debe ser compatible con
// ReporteAvanceAgregado (Fase 7a). `cabecera.proyecto.ubicacion` y
// `cabecera.fechaCorteAnterior` son opcionales: si no existen en el agregado, añadirlos
// (ubicacion en CabeceraReporte.proyecto; fechaCorteAnterior = fechaCorte de la semana previa).
export interface AggView {
  reporte: { alcanceTexto: string | null }
  cabecera: {
    numero: number | null
    fechaCorte: Date
    fechaCorteAnterior?: Date | null
    nombreArchivo: string
    proyecto: { nombre: string; codigo: string; numeroContrato: string | null; descripcion: string | null; ubicacion?: string | null }
    cliente: { nombre: string } | null
  }
}
