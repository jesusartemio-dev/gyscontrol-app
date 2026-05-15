import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { toDateKey } from '@/lib/utils/planificacion'

const ROLES_ADMIN = ['admin', 'gerente', 'gestor']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const proyectoId = searchParams.get('proyectoId')
    const inicioStr = searchParams.get('inicio')
    const finStr = searchParams.get('fin')

    if (!proyectoId || !inicioStr || !finStr) {
      return NextResponse.json(
        { error: 'proyectoId, inicio y fin son requeridos' },
        { status: 400 },
      )
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        liderId: true,
        supervisorId: true,
        gestorId: true,
        lider: { select: { id: true, name: true } },
      },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Control de acceso: admin/gerente/gestor o el lider/supervisor/gestor del proyecto
    const role = (session.user as any).role as string
    const userId = session.user.id
    const tieneAcceso =
      ROLES_ADMIN.includes(role) ||
      [proyecto.liderId, proyecto.supervisorId, proyecto.gestorId].includes(userId)
    if (!tieneAcceso) {
      return NextResponse.json({ error: 'Sin permisos para ver este proyecto' }, { status: 403 })
    }

    const inicio = new Date(inicioStr + 'T00:00:00.000Z')
    const fin = new Date(finStr + 'T00:00:00.000Z')

    const celdas = await prisma.planificacionDia.findMany({
      where: { proyectoId, fecha: { gte: inicio, lte: fin } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ userId: 'asc' }, { fecha: 'asc' }],
    })

    // Agrupar por userId
    const personaMap = new Map<
      string,
      { userId: string; nombre: string; dias: Record<string, 'presente'> }
    >()

    for (const celda of celdas) {
      if (!personaMap.has(celda.userId)) {
        personaMap.set(celda.userId, {
          userId: celda.userId,
          nombre: celda.user.name ?? celda.userId,
          dias: {},
        })
      }
      personaMap.get(celda.userId)!.dias[toDateKey(celda.fecha)] = 'presente'
    }

    return NextResponse.json({
      proyecto: {
        id: proyecto.id,
        codigo: proyecto.codigo,
        nombre: proyecto.nombre,
        lider: proyecto.lider,
      },
      rango: { inicio: inicioStr, fin: finStr },
      personas: Array.from(personaMap.values()),
    })
  } catch (error) {
    console.error('[GET /api/planificacion/proyecto]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
