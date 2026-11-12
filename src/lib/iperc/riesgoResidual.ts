// ===================================================
// 📁 riesgoResidual.ts
// 📌 La regla con la que el SSOMA valora el riesgo residual, y el manejo de
//    los controles como lista de ítems.
//
// La regla, tal como la aplica a mano en el Excel:
//   - si la fila tiene control de INGENIERÍA  → la severidad residual sube 1
//   - si la fila tiene control ADMINISTRATIVO → la probabilidad residual sube 1
//
// "Subir" es mejorar: severidad 1 es catastrófica y 5 menor; probabilidad A es
// común y E prácticamente imposible. Los topes son 5 y E.
//
// Esto se calcula, no se le pregunta a la IA. Medido sobre el IPERC de CJM52,
// la IA incumplía la regla en 101 de 150 filas, y casi siempre bajando de más
// la probabilidad residual — o sea, haciendo ver el riesgo menor de lo que el
// criterio del SSOMA diría.
// ===================================================

export const PROBABILIDADES = ['A', 'B', 'C', 'D', 'E'] as const
export type Probabilidad = (typeof PROBABILIDADES)[number]

/**
 * Supuestos pendientes de confirmar con SSOMA; están aquí a propósito para que
 * cambiarlos sea una línea:
 *  - sin control de ingeniería, la severidad residual es igual a la inicial;
 *  - EPP, eliminación y sustitución no mueven la valoración;
 *  - dos controles del mismo tipo siguen sumando 1, no 2.
 */
export const EPP_MUEVE_VALORACION = false

/** Un control cuenta si tiene texto real. "NA" y vacío no cuentan. */
export function tieneControl(texto?: string | null): boolean {
  if (!texto) return false
  const t = texto.trim()
  return t !== '' && t.toUpperCase() !== 'NA' && t !== '-' && t !== '—'
}

export interface Residual {
  severidadResidual: number
  probabilidadResidual: string
}

export function calcularResidual(
  severidad: number,
  probabilidad: string,
  controlIngenieria?: string | null,
  controlAdministrativo?: string | null,
): Residual {
  const sev = Number.isFinite(severidad) ? severidad : 5
  const subeSeveridad = tieneControl(controlIngenieria) ? 1 : 0
  const subeProbabilidad = tieneControl(controlAdministrativo) ? 1 : 0

  const i = PROBABILIDADES.indexOf(String(probabilidad).trim().toUpperCase() as Probabilidad)
  const iResidual = i < 0 ? -1 : Math.min(PROBABILIDADES.length - 1, i + subeProbabilidad)

  return {
    severidadResidual: Math.min(5, Math.max(1, sev + subeSeveridad)),
    // Si la probabilidad inicial no es válida no se inventa nada.
    probabilidadResidual: iResidual < 0 ? String(probabilidad ?? '') : PROBABILIDADES[iResidual],
  }
}

/** true si la fila ya cumple la regla. */
export function cumpleRegla(fila: {
  severidad: number
  probabilidad: string
  severidadResidual: number
  probabilidadResidual: string
  controlIngenieria?: string | null
  controlAdministrativo?: string | null
}): boolean {
  const r = calcularResidual(
    fila.severidad, fila.probabilidad, fila.controlIngenieria, fila.controlAdministrativo,
  )
  return (
    fila.severidadResidual === r.severidadResidual &&
    fila.probabilidadResidual === r.probabilidadResidual
  )
}

// ─── Controles como lista ───────────────────────────────────────────────────

/**
 * El SSOMA escribe los controles como viñetas, uno por línea. La IA los
 * devuelve como un párrafo con las ideas pegadas con puntos: de las 150 filas
 * de CJM52, las 150 tenían varias ideas en una sola frase y solo una usaba
 * viñetas.
 *
 * Se guardan como texto con un ítem por línea. No hace falta cambiar el
 * esquema y el Excel los muestra bien, porque la celda ya va con wrap_text.
 */
export function itemsDeControl(texto?: string | null): string[] {
  if (!tieneControl(texto)) return []
  return String(texto)
    .split(/\r?\n/)
    .flatMap(linea =>
      // Una línea que viene como párrafo se parte en oraciones. No se corta en
      // abreviaturas comunes ni en números: "D.S. 024-2016" debe quedar entero.
      linea.includes('\n') ? [linea] : partirEnOraciones(linea),
    )
    .map(limpiarVinieta)
    .filter(x => x !== '')
}

function partirEnOraciones(linea: string): string[] {
  const texto = linea.trim()
  if (!texto) return []
  // Punto seguido de espacio y mayúscula, salvo tras una sigla de una letra.
  const partes = texto.split(/(?<![A-ZÁÉÍÓÚÑ])\.\s+(?=[A-ZÁÉÍÓÚÑ¡¿])/g)
  return partes.map(p => p.trim()).filter(Boolean)
}

function limpiarVinieta(s: string): string {
  return s
    .trim()
    .replace(/^[*•\-–—]\s*/, '')
    .replace(/\s*\.\s*$/, '')
    .trim()
}

/** Texto a guardar en BD: un ítem por línea, sin viñetas. */
export function normalizarControl(texto?: string | null): string {
  const items = itemsDeControl(texto)
  return items.join('\n')
}

/** Como lo espera el Excel del SSOMA: una viñeta por línea. */
export function controlParaExcel(texto?: string | null): string {
  const items = itemsDeControl(texto)
  if (items.length === 0) return 'NA'
  if (items.length === 1) return items[0]
  return items.map(x => `* ${x}`).join('\n')
}

// ─── Aplicación a una fila que se va a guardar ──────────────────────────────

export interface DatosFilaRiesgo {
  severidad?: number
  probabilidad?: string
  controlIngenieria?: string | null
  controlAdministrativo?: string | null
  controlReceptor?: string | null
  severidadResidual?: number
  probabilidadResidual?: string
}

/**
 * Normaliza los controles y recalcula el residual antes de guardar.
 *
 * `actual` es la fila como está en BD: en una edición parcial los campos que
 * no vienen en el payload salen de ahí, porque la regla necesita severidad,
 * probabilidad y los dos controles aunque solo se esté tocando uno.
 *
 * El residual que llegue en el payload se ignora a propósito: lo manda la
 * regla, no quien edita ni la IA.
 */
export function aplicarReglasFila<T extends DatosFilaRiesgo>(
  datos: T,
  actual?: DatosFilaRiesgo | null,
): T {
  const salida: T = { ...datos }

  for (const campo of ['controlIngenieria', 'controlAdministrativo', 'controlReceptor'] as const) {
    if (campo in datos) {
      ;(salida as DatosFilaRiesgo)[campo] = normalizarControl(datos[campo])
    }
  }

  const severidad = datos.severidad ?? actual?.severidad
  const probabilidad = datos.probabilidad ?? actual?.probabilidad
  if (severidad == null || probabilidad == null) return salida

  const ing = 'controlIngenieria' in salida ? salida.controlIngenieria : actual?.controlIngenieria
  const adm = 'controlAdministrativo' in salida ? salida.controlAdministrativo : actual?.controlAdministrativo

  const r = calcularResidual(severidad, probabilidad, ing, adm)
  ;(salida as DatosFilaRiesgo).severidadResidual = r.severidadResidual
  ;(salida as DatosFilaRiesgo).probabilidadResidual = r.probabilidadResidual
  return salida
}
