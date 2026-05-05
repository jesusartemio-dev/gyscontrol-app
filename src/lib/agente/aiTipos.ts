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
  'chat':                { label: 'Chat / Análisis TDR',    color: '#2563eb' }, // blue-600
  'chat-simple':         { label: 'Chat (rápido)',          color: '#60a5fa' }, // blue-400
  'pdf-preprocessing':   { label: 'Pre-procesamiento PDF',  color: '#a855f7' }, // purple-500
  'excel-extraction':    { label: 'Importación Excel',      color: '#10b981' }, // emerald-500
  'pdf-extraction':      { label: 'Importación PDF',        color: '#f59e0b' }, // amber-500
  'ocr':                 { label: 'OCR Comprobantes',       color: '#ef4444' }, // red-500
  'scan-cotizacion':     { label: 'Escanear PDF Cotización',color: '#ec4899' }, // pink-500
  'import-catalogo-pdf':        { label: 'Importar Catálogo PDF',  color: '#06b6d4' }, // cyan-500
  'ssoma-documento':            { label: 'SSOMA — Generar docs',   color: '#84cc16' }, // lime-500
  'ssoma-documento-regenerar':  { label: 'SSOMA — Regenerar doc',  color: '#65a30d' }, // lime-600
}

export function getTipoInfo(tipo: string): TipoInfo {
  return TIPO_INFO[tipo] ?? { label: tipo, color: FALLBACK_COLOR }
}

export function getTipoLabel(tipo: string): string {
  return getTipoInfo(tipo).label
}
