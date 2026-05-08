import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { NextRequest } from 'next/server'

// POST — Extraer datos de un bloque específico del TDR usando IA
// Stub: pendiente de implementación en Bloque 4
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const { bloque } = body as { bloque?: string }

  if (!bloque) {
    return NextResponse.json({ error: 'Falta el campo bloque' }, { status: 400 })
  }

  // TODO: implementar extracción por bloque con Claude
  // Por ahora devuelve 501 para que el cliente muestre un toast apropiado
  return NextResponse.json(
    {
      error: 'Extracción por bloque aún no implementada',
      cotizacionId: id,
      bloque,
    },
    { status: 501 },
  )
}
