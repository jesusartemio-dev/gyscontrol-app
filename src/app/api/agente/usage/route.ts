import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUsageStats } from '@/lib/agente/usageTracker'
import type { UsagePeriod } from '@/lib/agente/usageTracker'

// GET /api/agente/usage?periodo=mes&userId=optional
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Only admin and gerente can view usage stats
  const role = (session.user as { role?: string }).role
  if (!['admin', 'gerente'].includes(role || '')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const url = new URL(request.url)
  const periodo = (url.searchParams.get('periodo') || 'mes') as UsagePeriod
  const userId = url.searchParams.get('userId') || undefined

  if (!['hoy', 'semana', 'mes'].includes(periodo)) {
    return NextResponse.json({ error: 'Periodo inválido. Usar: hoy, semana, mes' }, { status: 400 })
  }

  const stats = await getUsageStats(periodo, userId)
  return NextResponse.json(stats)
}
