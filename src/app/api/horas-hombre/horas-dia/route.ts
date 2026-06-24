import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/horas-hombre/horas-dia?fecha=YYYY-MM-DD
// Devuelve el total de horas ya registradas por el usuario en esa fecha
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha') // formato YYYY-MM-DD

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ error: 'Fecha inválida. Use formato YYYY-MM-DD' }, { status: 400 })
    }

    // Los registros se guardan al mediodía UTC (T12:00:00Z) para evitar shifts de TZ.
    // Buscar con rango amplio que cubra todo el día calendario local.
    const fechaStart = new Date(`${fecha}T00:00:00.000Z`)
    const fechaEnd = new Date(`${fecha}T23:59:59.999Z`)

    const agg = await prisma.registroHoras.aggregate({
      where: {
        usuarioId: session.user.id,
        fechaTrabajo: { gte: fechaStart, lte: fechaEnd }
      },
      _sum: { horasTrabajadas: true }
    })

    const horasRegistradas = Math.round((agg._sum.horasTrabajadas ?? 0) * 10) / 10

    // Obtener horasPorDia del calendario activo
    const calendario = await prisma.calendarioLaboral.findFirst({
      where: { activo: true },
      select: { horasPorDia: true }
    })
    const horasPorDia = calendario?.horasPorDia ?? 9.5

    const horasDisponibles = Math.max(0, Math.round((horasPorDia - horasRegistradas) * 10) / 10)

    return NextResponse.json({
      success: true,
      data: {
        fecha,
        horasRegistradas,
        horasPorDia,
        horasDisponibles
      }
    })
  } catch (error) {
    console.error('Error obteniendo horas del día:', error)
    return NextResponse.json({ error: 'Error interno', success: false }, { status: 500 })
  }
}
