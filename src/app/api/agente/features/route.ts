import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getIAFeatureFlags, updateIAFeatureFlags } from '@/lib/agente/featureFlags'
import type { IAFeatureFlags } from '@/lib/agente/featureFlags'

// GET /api/agente/features
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (!['admin', 'gerente'].includes(role || '')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const flags = await getIAFeatureFlags()
  return NextResponse.json(flags)
}

// PUT /api/agente/features
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (!['admin', 'gerente'].includes(role || '')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = (await request.json()) as Partial<IAFeatureFlags>

  const validKeys: (keyof IAFeatureFlags)[] = [
    'chatGeneral',
    'chatCotizacion',
    'analisisTdr',
    'importacionExcel',
    'ocrComprobantes',
    'scanCotizacionPDF',
  ]

  // Only allow known boolean keys
  const sanitized: Partial<IAFeatureFlags> = {}
  for (const key of validKeys) {
    if (typeof body[key] === 'boolean') {
      sanitized[key] = body[key]
    }
  }

  const updated = await updateIAFeatureFlags(sanitized, (session.user as { id: string }).id)
  return NextResponse.json(updated)
}
