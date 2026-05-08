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
  // Análisis TDR standalone (independiente del chat)
  'tdr-analisis-pdf-lectura':    { label: 'TDR — Lectura PDF',      color: '#f97316' }, // orange-500
  'tdr-analisis-pdf-extraccion': { label: 'TDR — Extracción datos', color: '#ea580c' }, // orange-600
  'pdf-preprocessing':   { label: 'Pre-procesamiento PDF',  color: '#a855f7' }, // purple-500
  'excel-extraction':    { label: 'Importación Excel',      color: '#10b981' }, // emerald-500
  'pdf-extraction':      { label: 'Importación PDF',        color: '#f59e0b' }, // amber-500
  'ocr':                 { label: 'OCR Comprobantes',       color: '#ef4444' }, // red-500
  'scan-cotizacion':     { label: 'Escanear PDF Cotización',color: '#ec4899' }, // pink-500
  'import-catalogo-pdf':        { label: 'Importar Catálogo PDF',  color: '#06b6d4' }, // cyan-500
  // SSOMA — creación por tipo de documento
  'ssoma-iperc':              { label: 'SSOMA — IPERC',              color: '#65a30d' }, // lime-600
  'ssoma-pets':               { label: 'SSOMA — PETS',               color: '#16a34a' }, // green-600
  'ssoma-epp':                { label: 'SSOMA — Matriz EPP',         color: '#0891b2' }, // cyan-600
  'ssoma-plan-emergencia':    { label: 'SSOMA — Plan Emergencia',    color: '#059669' }, // emerald-600
  'ssoma-par':                { label: 'SSOMA — PAR',                color: '#0d9488' }, // teal-600
  // SSOMA — regeneración por tipo de documento
  'ssoma-iperc-regenerar':           { label: 'SSOMA — IPERC (regen)',           color: '#4d7c0f' }, // lime-700
  'ssoma-pets-regenerar':            { label: 'SSOMA — PETS (regen)',            color: '#15803d' }, // green-700
  'ssoma-epp-regenerar':             { label: 'SSOMA — Matriz EPP (regen)',      color: '#0e7490' }, // cyan-700
  'ssoma-plan-emergencia-regenerar': { label: 'SSOMA — Plan Emergencia (regen)', color: '#047857' }, // emerald-700
  'ssoma-par-regenerar':             { label: 'SSOMA — PAR (regen)',             color: '#0f766e' }, // teal-700
  // SSOMA — errores de API (tokens = 0, costo = 0; metadata contiene docTipo y errorMessage)
  'ssoma-error': { label: 'SSOMA — Error API', color: '#dc2626' }, // red-600
  // Matriz de Comunicaciones
  'matriz-comunicacion': { label: 'Matriz de Comunicaciones', color: '#7c3aed' }, // violet-700
  // Tipos legacy — mantener para registros históricos
  'ssoma-documento':            { label: 'SSOMA — Generar docs (legacy)',   color: '#84cc16' }, // lime-500
  'ssoma-documento-regenerar':  { label: 'SSOMA — Regenerar doc (legacy)',  color: '#a3a3a3' }, // neutral-400
}

export function getTipoInfo(tipo: string): TipoInfo {
  return TIPO_INFO[tipo] ?? { label: tipo, color: FALLBACK_COLOR }
}

export function getTipoLabel(tipo: string): string {
  return getTipoInfo(tipo).label
}
