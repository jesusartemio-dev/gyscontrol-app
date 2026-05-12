import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cargarContextoIperc } from '@/lib/iperc/cargarContexto'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const contexto = await cargarContextoIperc(proyectoId)
  if (!contexto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  return NextResponse.json({ data: contexto })
}
