/**
 * Constantes visuales para la plantilla de Reporte Semanal de Seguridad.
 * Extraídas del análisis de los PPTs originales — ver docs/PLANTILLA_PPT_SPEC.md
 */

import path from 'node:path'

// ─── Colores corporativos ────────────────────────────────────────────────────
export const COLORS = {
  ORANGE_PRIMARY: 'FF5000', // naranja primario (acentos, títulos, banda superior)
  ORANGE_DARK: 'D73B00',
  GRAY_DARK: '3B3B3B', // texto principal
  GRAY_LIGHT: 'DADADA', // bordes, separadores
  GRAY_PLACEHOLDER: 'E5E5E5', // placeholders de fotos
  BLACK: '000000',
  WHITE: 'FFFFFF',
  GREEN_GYS: '8DC641',
  COVER_BG: '1D1D1D', // fondo de portada y cierre
  FOOTER_GRAY: '888888',
} as const

// ─── Tipografías ─────────────────────────────────────────────────────────────
export const FONTS = {
  TITLE_LARGE: 'Verdana', // títulos grandes (portada)
  SECTION: 'Arial', // títulos de sección y cuerpos
  BODY: 'Calibri', // descripciones largas
} as const

// ─── Layout ──────────────────────────────────────────────────────────────────
export const SLIDE = {
  WIDTH: 13.333,
  HEIGHT: 7.5,
} as const

// Banda naranja superior común a slides 3-9
export const HEADER_BANNER = {
  X: 0,
  Y: 0,
  W: SLIDE.WIDTH,
  H: 0.85,
}

export const FOOTER_Y = 7.15
export const FOOTER_H = 0.3

// ─── Assets locales ──────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'seguridad', 'plantilla-ppt')

export const ASSETS = {
  LOGO_NEXA: path.join(PUBLIC_DIR, 'logo_nexa.png'),
  LOGO_GYS: path.join(PUBLIC_DIR, 'logo_gys.png'),
} as const

// ─── Posiciones de slides (todas en pulgadas) ────────────────────────────────

// SLIDE 1 — Portada
export const PORTADA = {
  TITULO: { x: 1.233, y: 2.096, w: 11.261, h: 1.496 },
  LOGO_CLIENTE: { x: 5.564, y: 3.356, w: 2.457, h: 0.945 },
  AREA_RESPONSABLE: { x: 1.392, y: 5.772, w: 5.139, h: 0.386 },
}

// SLIDE 2 — HHT + COVID
export const HHT_COVID = {
  TITULO_HHT: { x: 0.249, y: 0.359, w: 12.433, h: 0.438 },
  TABLA_HHT: { x: 0.308, y: 0.828, w: 12.315, h: 2.826 },
  TITULO_COVID: { x: 0.367, y: 4.211, w: 12.315, h: 0.438 },
  TABLA_COVID: { x: 0.367, y: 4.676, w: 12.315, h: 1.255 },
}

// SLIDE 3-4 — Charlas / Inspecciones (grid 3 columnas)
export const GRID_3_COLS = {
  COL_1: { x: 0.286, w: 4.174 },
  COL_2: { x: 4.681, w: 3.95 },
  COL_3: { x: 8.749, w: 3.95 },
  FOTO_Y: 1.179,
  FOTO_H: 4.724,
  MARCO_Y: 0.984,
  MARCO_H: 5.119,
  CAPTION_Y: 6.241,
  CAPTION_H: 0.774,
}

// SLIDE 5 — Incidentes y Notificaciones
export const INCIDENTES = {
  SUBTITULO_INC: { x: 0.513, y: 1.45, w: 1.605, h: 0.438 },
  TEXTO_INC: { x: 0.513, y: 2.0, w: 12.5, h: 1.6 },
  SUBTITULO_NOT: { x: 0.513, y: 3.75, w: 2.156, h: 0.438 },
  TEXTO_NOT: { x: 0.513, y: 4.3, w: 12.5, h: 2.0 },
}

// SLIDE 6 — Actividades (2 columnas asimétrico)
export const ACTIVIDADES = {
  MARCO_IZQ: { x: 0.369, y: 1.009, w: 5.982, h: 5.015 },
  MARCO_DER: { x: 6.982, y: 0.994, w: 5.7, h: 4.998 },
  FOTO_IZQ_TOP: { x: 0.798, y: 1.103, w: 4.899, h: 2.756 },
  FOTO_IZQ_BOTTOM: { x: 0.798, y: 3.948, w: 4.899, h: 1.969 },
  FOTO_DER_BIG: { x: 7.06, y: 3.199, w: 5.434, h: 2.684 },
  FOTO_DER_TILE: { x: 7.533, y: 1.095, w: 1.969, h: 1.969 },
  CAPTION_IZQ: { x: 0.369, y: 6.205, w: 5.982, h: 0.606 },
  CAPTION_DER: { x: 6.982, y: 6.222, w: 5.7, h: 0.438 },
}

// SLIDE 7 — Riesgo Crítico
export const RIESGO = {
  MARCO: { x: 0.249, y: 0.862, w: 12.539, h: 6.116 },
  FOTO_1: { x: 0.936, y: 1.274, w: 2.657, h: 4.724 },
  FOTO_2: { x: 4.034, y: 1.274, w: 2.657, h: 4.724 },
  TEXTO: { x: 6.939, y: 1.255, w: 5.555, h: 4.948 },
}

// SLIDE 8 — Medio Ambiente
export const MEDIO_AMBIENTE = {
  TEXTO: { x: 0.255, y: 2.333, w: 2.48, h: 1.616 },
  MARCO_FOTO: { x: 2.887, y: 1.255, w: 9.716, h: 5.434 },
  FOTO: { x: 3.108, y: 1.886, w: 9.274, h: 4.173 },
}

// SLIDE 9 — Prevención
export const PREVENCION = {
  CAJA_TITULO: { x: 1.218, y: 1.073, w: 3.465, h: 1.575 },
  MARCO_FOTOS: { x: 4.934, y: 1.073, w: 7.245, h: 4.72 },
  FOTO_TOP: { x: 6.115, y: 1.388, w: 5.249, h: 2.362 },
  FOTO_BOTTOM: { x: 6.903, y: 3.829, w: 3.785, h: 1.85 },
  CAPTION: { x: 1.214, y: 2.865, w: 3.465, h: 2.625 },
}

// SLIDE 10 — Cierre
export const CIERRE = {
  TITULO: { x: 1.392, y: 0.434, w: 10.536, h: 4.838 },
}

// ─── Title text por slide ────────────────────────────────────────────────────
export const TITULOS = {
  CHARLAS: 'Charlas de NDAD de la semana',
  INSPECCIONES: 'Inspecciones de la semana',
  INCIDENTES: 'Reporte de Incidentes y Notificaciones',
  ACTIVIDADES: 'Actividades de la Semana – Registro Fotográfico',
  RIESGO: "Riesgo Crítico – ('Indicar el riesgo crítico mejor controlado, incluya fotografías con presencia del Supervisor de campo')",
  MEDIO_AMBIENTE: "Medio Ambiente – ('Fotografías de manejo de residuos, recursos naturales, químicos, entre otros del proceso productivo de Nexa')",
  PREVENCION: "Control Covid 19 - ('No duplicar actitud – condición')",
  CIERRE: 'Gracias',
} as const
