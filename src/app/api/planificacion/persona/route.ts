import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { toDateKey } from '@/lib/utils/planificacion'

const ROLES_ADMIN = ['admin', 'gerente']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const targetUserId = searchParams.get('userId')
    const inicioStr = searchParams.get('inicio')
    const finStr = searchParams.get('fin')

    if (!targetUserId || !inicioStr || !finStr) {
      return NextResponse.json(
        { error: 'userId, inicio y fin son requeridos' },
        { status: 400 },
      )
    }

    // Solo admin/gerente pueden ver la agenda de otros
    const role = (session.user as any).role as string
    const isAdmin = ROLES_ADMIN.includes(role)
    if (!isAdmin && session.user.id !== targetUserId) {
      return NextResponse.json(
        { error: 'Solo puedes consultar tu propia agenda' },
        { status: 403 },
      )
    }

    const inicio = new Date(inicioStr + 'T00:00:00.000Z')
    const fin = new Date(finStr + 'T00:00:00.000Z')

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const celdas = await prisma.planificacionDia.findMany({
      where: { userId: targetUserId, fecha: { gte: inicio, lte: fin } },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        solicitudAusencia: {
          select: { tipoAusencia: { select: { nombre: true, color: true } } },
        },
      },
      orderBy: [{ fecha: 'asc' }, { turno: 'asc' }],
    })

    const diasMap: Record<
      string,
      Array<{
        id: string
        turno: string
        tipo: 'proyecto' | 'ausencia'
        proyecto?: { id: string; codigo: string; nombre: string }
        ausencia?: { nombre: string; color: string | null }
        esExcepcional: boolean
        notas: string | null
      }>
    > = {}

    for (const celda of celdas) {
      const k = toDateKey(celda.fecha)
      if (!diasMap[k]) diasMap[k] = []
      diasMap[k].push({
        id: celda.id,
        turno: celda.turno,
        tipo: celda.proyectoId ? 'proyecto' : 'ausencia',
        proyecto: celda.proyecto ?? undefined,
        ausencia: celda.solicitudAusencia?.tipoAusencia ?? undefined,
        esExcepcional: celda.esExcepcional,
        notas: celda.notas,
      })
    }

    return NextResponse.json({
      usuario: user,
      rango: { inicio: inicioStr, fin: finStr },
      dias: diasMap,
    })
  } catch (error) {
    console.error('[GET /api/planificacion/persona]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
