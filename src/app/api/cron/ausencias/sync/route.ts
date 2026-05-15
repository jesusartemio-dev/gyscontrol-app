// CRON: Sync absence states
// 00:05 UTC — activate approved absences that started today
// 23:55 UTC — finalise in-progress absences that ended today

import { NextRequest, NextResponse } from 'next/server'
import { activarAusenciasEnCurso, finalizarAusencias } from '@/lib/crons/ausencias'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Determine which job to run based on query param; run both if not specified
  const url = new URL(request.url)
  const job = url.searchParams.get('job') // 'activar' | 'finalizar' | null

  try {
    let activadas = 0
    let finalizadas = 0

    if (!job || job === 'activar') {
      const res = await activarAusenciasEnCurso()
      activadas = res.activadas
    }
    if (!job || job === 'finalizar') {
      const res = await finalizarAusencias()
      finalizadas = res.finalizadas
    }

    return NextResponse.json({
      ok: true,
      activadas,
      finalizadas,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON /api/cron/ausencias/sync]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
