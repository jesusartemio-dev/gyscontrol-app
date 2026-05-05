// src/app/api/agente/usage/calls/route.ts
// Drill-down y export CSV de llamadas individuales a la API de IA.
// Permite filtrar por tipo, usuario y mes, devolviendo JSON o CSV.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_LIMIT = 500

function getPeriodStart(periodo: string): Date {
  const now = new Date()
  switch (periodo) {
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
    case 'mes':
    default: {
      const d = new Date(now)
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      return d
    }
  }
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (!['admin', 'gerente'].includes(role || '')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const url = new URL(request.url)
  const periodo = url.searchParams.get('periodo') || 'mes'
  const mes = url.searchParams.get('mes')
  const tipo = url.searchParams.get('tipo') || undefined
  const userIdFilter = url.searchParams.get('userId') || undefined
  const format = url.searchParams.get('format') || 'json'
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10)
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), MAX_LIMIT)

  if (mes && !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: 'Formato de mes invalido. Usar: YYYY-MM' }, { status: 400 })
  }

  // Rango temporal
  let since: Date
  let until: Date | undefined
  if (mes) {
    const [year, month] = mes.split('-').map(Number)
    since = new Date(year, month - 1, 1)
    until = new Date(year, month, 1)
  } else {
    since = getPeriodStart(periodo)
  }

  // Para CSV: traemos hasta el MAX_LIMIT siempre, ignoramos el limit del cliente
  const effectiveLimit = format === 'csv' ? MAX_LIMIT : limit

  const where: Record<string, unknown> = {
    createdAt: until ? { gte: since, lt: until } : { gte: since },
  }
  if (tipo) where.tipo = tipo
  if (userIdFilter) where.userId = userIdFilter

  const records = await prisma.agenteUsage.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      tipo: true,
      modelo: true,
      tokensInput: true,
      tokensOutput: true,
      tokensCacheCreation: true,
      tokensCacheRead: true,
      costoEstimado: true,
      duracionMs: true,
      conversacionId: true,
      metadata: true,
      userId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: effectiveLimit,
  })

  // Resolver nombres de usuario
  const userIds = Array.from(new Set(records.map((r) => r.userId)))
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const userNameMap = new Map(users.map((u) => [u.id, u.name || u.email || u.id]))

  const rows = records.map((r) => {
    const meta = r.metadata as Record<string, unknown> | null
    return {
      id: r.id,
      fecha: r.createdAt.toISOString(),
      usuario: userNameMap.get(r.userId) || r.userId,
      userId: r.userId,
      tipo: r.tipo,
      modelo: r.modelo.includes('haiku') ? 'Haiku' : r.modelo.includes('sonnet') ? 'Sonnet' : r.modelo,
      modeloFull: r.modelo,
      tokensInput: r.tokensInput,
      tokensOutput: r.tokensOutput,
      tokensCacheCreation: r.tokensCacheCreation,
      tokensCacheRead: r.tokensCacheRead,
      costoEstimado: r.costoEstimado,
      duracionMs: r.duracionMs,
      conversacionId: r.conversacionId,
      fileName: typeof meta?.fileName === 'string' ? meta.fileName : null,
      sheet: typeof meta?.sheet === 'string' ? meta.sheet : null,
      pages: typeof meta?.pages === 'number' ? meta.pages : null,
    }
  })

  if (format === 'csv') {
    const headers = [
      'fecha',
      'usuario',
      'tipo',
      'modelo',
      'tokensInput',
      'tokensOutput',
      'tokensCacheCreation',
      'tokensCacheRead',
      'costoEstimado',
      'duracionMs',
      'fileName',
      'conversacionId',
    ]
    const lines = [headers.join(',')]
    for (const r of rows) {
      lines.push([
        r.fecha,
        r.usuario,
        r.tipo,
        r.modeloFull,
        r.tokensInput,
        r.tokensOutput,
        r.tokensCacheCreation,
        r.tokensCacheRead,
        r.costoEstimado.toFixed(6),
        r.duracionMs ?? '',
        r.fileName ?? '',
        r.conversacionId ?? '',
      ].map(csvEscape).join(','))
    }
    const csv = lines.join('\n')
    const filenameSuffix = [
      mes ?? periodo,
      tipo ? `tipo-${tipo}` : null,
      userIdFilter ? `user-${userIdFilter.slice(0, 8)}` : null,
    ].filter(Boolean).join('_')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="uso-ia_${filenameSuffix}.csv"`,
      },
    })
  }

  return NextResponse.json({ rows, total: rows.length, limit: effectiveLimit })
}
