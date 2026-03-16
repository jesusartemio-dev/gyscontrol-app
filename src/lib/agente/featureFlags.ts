// src/lib/agente/featureFlags.ts
// Feature flags for AI tools — stored in ConfiguracionGeneral.iaFeatures

import { prisma } from '@/lib/prisma'

export interface IAFeatureFlags {
  chatGeneral: boolean
  chatCotizacion: boolean
  analisisTdr: boolean
  importacionExcel: boolean
  ocrComprobantes: boolean
  scanCotizacionPDF: boolean
  importCatalogoPDF: boolean
}

const DEFAULT_FLAGS: IAFeatureFlags = {
  chatGeneral: true,
  chatCotizacion: true,
  analisisTdr: true,
  importacionExcel: true,
  ocrComprobantes: true,
  scanCotizacionPDF: true,
  importCatalogoPDF: true,
}

function parseFlags(raw: unknown): IAFeatureFlags {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FLAGS }
  const obj = raw as Record<string, unknown>
  return {
    chatGeneral: typeof obj.chatGeneral === 'boolean' ? obj.chatGeneral : DEFAULT_FLAGS.chatGeneral,
    chatCotizacion: typeof obj.chatCotizacion === 'boolean' ? obj.chatCotizacion : DEFAULT_FLAGS.chatCotizacion,
    analisisTdr: typeof obj.analisisTdr === 'boolean' ? obj.analisisTdr : DEFAULT_FLAGS.analisisTdr,
    importacionExcel: typeof obj.importacionExcel === 'boolean' ? obj.importacionExcel : DEFAULT_FLAGS.importacionExcel,
    ocrComprobantes: typeof obj.ocrComprobantes === 'boolean' ? obj.ocrComprobantes : DEFAULT_FLAGS.ocrComprobantes,
    scanCotizacionPDF: typeof obj.scanCotizacionPDF === 'boolean' ? obj.scanCotizacionPDF : DEFAULT_FLAGS.scanCotizacionPDF,
    importCatalogoPDF: typeof obj.importCatalogoPDF === 'boolean' ? obj.importCatalogoPDF : DEFAULT_FLAGS.importCatalogoPDF,
  }
}

export async function getIAFeatureFlags(): Promise<IAFeatureFlags> {
  try {
    const config = await prisma.configuracionGeneral.findUnique({
      where: { id: 'default' },
      select: { iaFeatures: true },
    })
    return parseFlags(config?.iaFeatures)
  } catch {
    return { ...DEFAULT_FLAGS }
  }
}

export async function updateIAFeatureFlags(
  flags: Partial<IAFeatureFlags>,
  updatedBy?: string
): Promise<IAFeatureFlags> {
  const current = await getIAFeatureFlags()
  const merged = { ...current, ...flags }

  await prisma.configuracionGeneral.upsert({
    where: { id: 'default' },
    update: { iaFeatures: merged as Record<string, boolean>, updatedBy: updatedBy ?? null },
    create: { id: 'default', iaFeatures: merged as Record<string, boolean>, updatedBy: updatedBy ?? null },
  })

  return merged
}

export async function isIAFeatureEnabled(feature: keyof IAFeatureFlags): Promise<boolean> {
  const flags = await getIAFeatureFlags()
  return flags[feature]
}
