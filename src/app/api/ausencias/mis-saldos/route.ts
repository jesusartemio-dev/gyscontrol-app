import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/ausencias/mis-saldos
// Devuelve los saldos del usuario logueado para el año actual
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const anio = new Date().getFullYear()
    const saldos = await prisma.saldoAusencia.findMany({
      where: { userId: session.user.id, anio },
      include: {
        tipoAusencia: {
          select: { id: true, codigo: true, nombre: true, color: true, descuentaSaldo: true },
        },
      },
      orderBy: { tipoAusencia: { orden: 'asc' } },
    })

    return NextResponse.json(saldos)
  } catch (error) {
    console.error('[GET /api/ausencias/mis-saldos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
