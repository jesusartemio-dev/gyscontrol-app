// src/lib/agente/usageTracker.ts
// Tracks AI API usage (tokens, cost) per call for monitoring and cost control

import { prisma } from '@/lib/prisma'

// ── Cost tables (USD per 1M tokens) ──────────────────────

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.0 },
}

const DEFAULT_COST = { input: 3.0, output: 15.0 } // Assume Sonnet pricing if unknown

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || DEFAULT_COST
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000
}

// ── Track usage (fire-and-forget) ─────────────────────────

export interface TrackUsageParams {
  userId: string
  tipo: string
  modelo: string
  tokensInput: number
  tokensOutput: number
  conversacionId?: string | null
  duracionMs?: number
  metadata?: Record<string, unknown>
}

/**
 * Records an AI API call to the database.
 * Runs async without blocking — errors are logged but never thrown.
 */
export function trackUsage(params: TrackUsageParams): void {
  const costoEstimado = calculateCost(params.modelo, params.tokensInput, params.tokensOutput)

  // Fire and forget — don't await, don't block
  prisma.agenteUsage
    .create({
      data: {
        userId: params.userId,
        tipo: params.tipo,
        modelo: params.modelo,
        tokensInput: params.tokensInput,
        tokensOutput: params.tokensOutput,
        costoEstimado,
        conversacionId: params.conversacionId ?? undefined,
        duracionMs: params.duracionMs ?? undefined,
        metadata: params.metadata ?? undefined,
      },
    })
    .catch((err) => {
      console.error('[usageTracker] Failed to record usage:', err)
    })
}

// ── Monthly usage limit check ────────────────────────────

const DEFAULT_MONTHLY_LIMIT_USD = 25

async function getMonthlyLimit(): Promise<number> {
  try {
    const config = await prisma.configuracionGeneral.findUnique({
      where: { id: 'default' },
      select: { agenteLimiteMensualUsd: true },
    })
    if (config?.agenteLimiteMensualUsd && config.agenteLimiteMensualUsd > 0) {
      return config.agenteLimiteMensualUsd
    }
  } catch {
    // Fallback to env var or default
  }
  const envLimit = process.env.AGENTE_LIMITE_MENSUAL_USD
  if (envLimit) {
    const parsed = parseFloat(envLimit)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_MONTHLY_LIMIT_USD
}

export interface MonthlyUsage {
  costoTotal: number
  llamadasTotal: number
  limiteMensual: number
  porcentajeUsado: number
}

/**
 * Gets the current month's chat usage cost for a specific user.
 * Only counts chat types (not ocr, excel).
 */
export async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [result, limiteMensual] = await Promise.all([
    prisma.agenteUsage.aggregate({
      where: {
        userId,
        tipo: { in: ['chat', 'chat-simple', 'pdf-preprocess'] },
        createdAt: { gte: monthStart },
      },
      _sum: { costoEstimado: true },
      _count: true,
    }),
    getMonthlyLimit(),
  ])

  const costoTotal = result._sum.costoEstimado ?? 0

  return {
    costoTotal: Math.round(costoTotal * 1000) / 1000,
    llamadasTotal: result._count,
    limiteMensual,
    porcentajeUsado: limiteMensual > 0
      ? Math.round((costoTotal / limiteMensual) * 1000) / 10
      : 0,
  }
}

/**
 * Gets total monthly usage across ALL users (company-wide limit).
 */
export async function getCompanyMonthlyUsage(): Promise<MonthlyUsage> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [result, limiteMensual] = await Promise.all([
    prisma.agenteUsage.aggregate({
      where: {
        tipo: { in: ['chat', 'chat-simple', 'pdf-preprocess'] },
        createdAt: { gte: monthStart },
      },
      _sum: { costoEstimado: true },
      _count: true,
    }),
    getMonthlyLimit(),
  ])

  const costoTotal = result._sum.costoEstimado ?? 0

  return {
    costoTotal: Math.round(costoTotal * 1000) / 1000,
    llamadasTotal: result._count,
    limiteMensual,
    porcentajeUsado: limiteMensual > 0
      ? Math.round((costoTotal / limiteMensual) * 1000) / 10
      : 0,
  }
}

// ── Query usage stats ────────────────────────────────────

export type UsagePeriod = 'hoy' | 'semana' | 'mes'

function getPeriodStart(period: UsagePeriod): Date {
  const now = new Date()
  switch (period) {
    case 'hoy': {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      return d
    }
    case 'semana': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      d.setHours(0, 0, 0, 0)
      return d
    }
    case 'mes': {
      const d = new Date(now)
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      return d
    }
  }
}

export interface UsageStats {
  resumen: {
    costoTotal: number
    llamadasTotal: number
    tokensInputTotal: number
    tokensOutputTotal: number
  }
  porDia: Array<{ fecha: string; costo: number; llamadas: number }>
  porTipo: Array<{ tipo: string; costo: number; llamadas: number }>
  porModelo: Array<{ modelo: string; costo: number; llamadas: number }>
  porUsuario: Array<{ userId: string; nombre: string; costo: number; llamadas: number }>
}

export async function getUsageStats(
  period: UsagePeriod,
  userId?: string
): Promise<UsageStats> {
  const since = getPeriodStart(period)
  const where: Record<string, unknown> = { createdAt: { gte: since } }
  if (userId) where.userId = userId

  // All records in period
  const records = await prisma.agenteUsage.findMany({
    where,
    select: {
      tipo: true,
      modelo: true,
      tokensInput: true,
      tokensOutput: true,
      costoEstimado: true,
      createdAt: true,
      userId: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Resumen
  const resumen = {
    costoTotal: 0,
    llamadasTotal: records.length,
    tokensInputTotal: 0,
    tokensOutputTotal: 0,
  }
  for (const r of records) {
    resumen.costoTotal += r.costoEstimado
    resumen.tokensInputTotal += r.tokensInput
    resumen.tokensOutputTotal += r.tokensOutput
  }
  resumen.costoTotal = Math.round(resumen.costoTotal * 1000) / 1000

  // Por día
  const dayMap = new Map<string, { costo: number; llamadas: number }>()
  for (const r of records) {
    const fecha = r.createdAt.toISOString().split('T')[0]
    const entry = dayMap.get(fecha) || { costo: 0, llamadas: 0 }
    entry.costo += r.costoEstimado
    entry.llamadas += 1
    dayMap.set(fecha, entry)
  }
  const porDia = Array.from(dayMap.entries())
    .map(([fecha, v]) => ({ fecha, costo: Math.round(v.costo * 1000) / 1000, llamadas: v.llamadas }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Por tipo
  const tipoMap = new Map<string, { costo: number; llamadas: number }>()
  for (const r of records) {
    const entry = tipoMap.get(r.tipo) || { costo: 0, llamadas: 0 }
    entry.costo += r.costoEstimado
    entry.llamadas += 1
    tipoMap.set(r.tipo, entry)
  }
  const porTipo = Array.from(tipoMap.entries())
    .map(([tipo, v]) => ({ tipo, costo: Math.round(v.costo * 1000) / 1000, llamadas: v.llamadas }))
    .sort((a, b) => b.costo - a.costo)

  // Por modelo (friendly name)
  const modeloMap = new Map<string, { costo: number; llamadas: number }>()
  for (const r of records) {
    const friendlyName = r.modelo.includes('haiku') ? 'Haiku' : r.modelo.includes('sonnet') ? 'Sonnet' : r.modelo
    const entry = modeloMap.get(friendlyName) || { costo: 0, llamadas: 0 }
    entry.costo += r.costoEstimado
    entry.llamadas += 1
    modeloMap.set(friendlyName, entry)
  }
  const porModelo = Array.from(modeloMap.entries())
    .map(([modelo, v]) => ({ modelo, costo: Math.round(v.costo * 1000) / 1000, llamadas: v.llamadas }))
    .sort((a, b) => b.costo - a.costo)

  // Por usuario — fetch names
  const userMap = new Map<string, { costo: number; llamadas: number }>()
  for (const r of records) {
    const entry = userMap.get(r.userId) || { costo: 0, llamadas: 0 }
    entry.costo += r.costoEstimado
    entry.llamadas += 1
    userMap.set(r.userId, entry)
  }
  const userIds = Array.from(userMap.keys())
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const userNameMap = new Map(users.map((u) => [u.id, u.name || u.email || u.id]))
  const porUsuario = Array.from(userMap.entries())
    .map(([uid, v]) => ({
      userId: uid,
      nombre: userNameMap.get(uid) || uid,
      costo: Math.round(v.costo * 1000) / 1000,
      llamadas: v.llamadas,
    }))
    .sort((a, b) => b.costo - a.costo)

  return { resumen, porDia, porTipo, porModelo, porUsuario }
}
