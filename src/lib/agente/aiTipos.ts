// src/lib/agente/aiTipos.ts
// Friendly labels and chart colors for AI usage `tipo` codes.
// Single source of truth shared by tracker and admin UI so any new tipo only
// needs to be registered here.

export interface TipoInfo {
  /** Label mostrado al usuario en tablas, charts y tooltips */
  label: string
  /** Color HEX para charts (recharts). Mantener distintivo entre tipos */
  color: string
}

const FALLBACK_COLOR = '#94a3b8' // slate-400

export const TIPO_INFO: Record<string, TipoInfo> = {
  'chat':                { label: 'Chat',                   color: '#2563eb' }, // blue-600
  'chat-simple':         { label: 'Chat (rápido)',          color: '#60a5fa' }, // blue-400
  // Análisis TDR standalone — cotización
  'tdr-analisis-pdf-lectura':    { label: 'TDR Cotización — Lectura PDF',      color: '#f97316' }, // orange-500
  'tdr-analisis-pdf-extraccion': { label: 'TDR Cotización — Extracción datos', color: '#ea580c' }, // orange-600
  // Análisis TDR standalone — proyecto
  'tdr-proyecto-pdf-lectura':    { label: 'TDR Proyecto — Lectura PDF',      color: '#fb923c' }, // orange-400
  'tdr-proyecto-pdf-extraccion': { label: 'TDR Proyecto — Extracción datos', color: '#c2410c' }, // orange-700
  'pdf-preprocessing':   { label: 'Pre-procesamiento PDF',  color: '#a855f7' }, // purple-500
  'excel-extraction':    { label: 'Importación Excel',      color: '#10b981' }, // emerald-500
  'pdf-extraction':      { label: 'Importación PDF',        color: '#f59e0b' }, // amber-500
  'ocr':                 { label: 'OCR Comprobantes',       color: '#ef4444' }, // red-500
  'scan-cotizacion':     { label: 'Escanear PDF Cotización',color: '#ec4899' }, // pink-500
  'import-catalogo-pdf':        { label: 'Importar Catálogo PDF',  color: '#06b6d4' }, // cyan-500
  // Matriz de Comunicaciones
  'matriz-comunicacion': { label: 'Matriz de Comunicaciones', color: '#7c3aed' }, // violet-700
  // Plan de Trabajo
  'plan-trabajo.generar':       { label: 'Plan de Trabajo — Generar',       color: '#0284c7' }, // sky-600
  'plan-trabajo.regenerar':     { label: 'Plan de Trabajo — Regenerar sección', color: '#0369a1' }, // sky-700
  // IPERC
  'iperc.resumen':              { label: 'IPERC — Resumen IA',              color: '#dc2626' }, // red-600
  'iperc.lote':                 { label: 'IPERC — Generación por lote',     color: '#b91c1c' }, // red-700
  // PETS granular
  'pets.indice':                { label: 'PETS — Índice',                   color: '#16a34a' }, // green-600
  'pets.restricciones':         { label: 'PETS — Restricciones',            color: '#15803d' }, // green-700
  'pets.regenerar.etapa':       { label: 'PETS — Regenerar etapa',          color: '#166534' }, // green-800
  'pets.regenerar.paso':        { label: 'PETS — Regenerar paso',           color: '#14532d' }, // green-900
  // MPP
  'mpp.generar':                { label: 'MPP — Generar',                   color: '#7c3aed' }, // violet-700
  // Valorizaciones IA
  'valorizacion-import-ia':     { label: 'Importar Valorización con IA',    color: '#0d9488' }, // teal-600
  'valorizacion-verificar-ia':  { label: 'Verificar Valorización con IA',   color: '#0f766e' }, // teal-700
}

// Prefix-based fallback rules for dynamic tipo codes like 'pets.etapa.A'
const TIPO_PREFIX_RULES: Array<{ prefix: string; info: TipoInfo }> = [
  { prefix: 'pets.etapa.',      info: { label: 'PETS — Generar etapa',    color: '#22c55e' } }, // green-500
  { prefix: 'plan-trabajo.',    info: { label: 'Plan de Trabajo',          color: '#0284c7' } },
  { prefix: 'iperc.',           info: { label: 'IPERC',                   color: '#dc2626' } },
  { prefix: 'pets.',            info: { label: 'PETS',                    color: '#16a34a' } },
  { prefix: 'mpp.',             info: { label: 'MPP',                     color: '#7c3aed' } },
]

export function getTipoInfo(tipo: string): TipoInfo {
  if (tipo in TIPO_INFO) return TIPO_INFO[tipo]
  for (const { prefix, info } of TIPO_PREFIX_RULES) {
    if (tipo.startsWith(prefix)) return info
  }
  return { label: tipo, color: FALLBACK_COLOR }
}

export function getTipoLabel(tipo: string): string {
  return getTipoInfo(tipo).label
}
