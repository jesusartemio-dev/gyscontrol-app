import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// GET /api/planificacion/badges-personas?userId=...
// Devuelve proyectos activos, saldo de vacaciones y próxima ausencia para una persona
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    const anio = new Date().getFullYear()

    const [proyectosActivos, saldoVac, proximaAusencia] = await Promise.all([
      prisma.personalProyecto.findMany({
        where: { userId, activo: true },
        include: {
          proyecto: {
            select: { id: true, codigo: true, nombre: true, estado: true },
          },
        },
      }),
      prisma.saldoAusencia.findFirst({
        where: {
          userId,
          anio,
          tipoAusencia: { codigo: 'VAC' },
        },
        select: { diasAsignados: true, diasGozados: true, diasDisponibles: true },
      }),
      prisma.solicitudAusencia.findFirst({
        where: {
          solicitanteId: userId,
          estado: { in: ['aprobada', 'pendiente'] },
          fechaInicio: { gte: new Date() },
        },
        orderBy: { fechaInicio: 'asc' },
        select: {
          id: true,
          estado: true,
          fechaInicio: true,
          fechaFin: true,
          tipoAusencia: { select: { nombre: true, color: true } },
        },
      }),
    ])

    return NextResponse.json({
      userId,
      proyectosActivos: proyectosActivos.map((p) => ({ ...p.proyecto, rol: p.rol })),
      saldoVacaciones: saldoVac,
      proximaAusencia,
    })
  } catch (error) {
    console.error('[GET /api/planificacion/badges-personas]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
