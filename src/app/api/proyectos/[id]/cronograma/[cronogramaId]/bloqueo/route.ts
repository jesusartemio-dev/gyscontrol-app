import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// PUT /api/proyectos/[id]/cronograma/[cronogramaId]/bloqueo
// Toggle bloqueado without affecting esBaseline
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userRole = (session.user as any).role

    const { id, cronogramaId } = await params

    const cronograma = await prisma.proyectoCronograma.findFirst({
      where: { id: cronogramaId, proyectoId: id }
    })

    if (!cronograma) {
      return NextResponse.json(
        { error: 'Cronograma no encontrado' },
        { status: 404 }
      )
    }

    if (cronograma.tipo === 'comercial') {
      return NextResponse.json(
        { error: 'Los cronogramas comerciales no se pueden desbloquear' },
        { status: 400 }
      )
    }

    const nuevoEstado = !cronograma.bloqueado

    // Desbloquear: solo admin | Bloquear: admin, gerente, gestor, coordinador
    if (nuevoEstado === false && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el administrador puede desbloquear cronogramas' },
        { status: 403 }
      )
    }
    const rolesBloquear = ['admin', 'gerente', 'gestor', 'coordinador']
    if (nuevoEstado === true && !rolesBloquear.includes(userRole)) {
      return NextResponse.json(
        { error: 'No tiene permisos para bloquear cronogramas' },
        { status: 403 }
      )
    }

    const updated = await prisma.proyectoCronograma.update({
      where: { id: cronogramaId },
      data: { bloqueado: nuevoEstado, updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: nuevoEstado
        ? 'Cronograma bloqueado exitosamente'
        : 'Cronograma desbloqueado exitosamente'
    })
  } catch (error) {
    logger.error('Error al cambiar bloqueo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
