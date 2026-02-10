import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'
import { sincronizarRealesProyecto } from '@/lib/utils/syncReales'

export const dynamic = 'force-dynamic'

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await context.params

  try {
    const count = await sincronizarRealesProyecto(proyectoId)

    return NextResponse.json({
      status: 'ok',
      mensaje: `Se sincronizaron ${count} ítems correctamente.`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno al sincronizar datos reales: ' + String(error) },
      { status: 500 }
    )
  }
}
