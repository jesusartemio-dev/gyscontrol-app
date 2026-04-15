import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/supervision/tareas/reordenar
// Persiste el nuevo orden de tareas de un proyecto interno
export async function PUT(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowedRoles = ['admin', 'coordinador', 'gestor', 'proyectos']
    if (!allowedRoles.includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { proyectoId, ordenes } = body as { proyectoId: string; ordenes: { id: string; orden: number }[] }

    if (!proyectoId || !Array.isArray(ordenes) || ordenes.length === 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Verificar que el proyecto es interno
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { esInterno: true }
    })

    if (!proyecto?.esInterno) {
      return NextResponse.json({ error: 'Solo se puede reordenar tareas de proyectos internos' }, { status: 400 })
    }

    // Actualizar orden en paralelo
    await Promise.all(
      ordenes.map(({ id, orden }) =>
        prisma.proyectoTarea.update({
          where: { id },
          data: { orden, updatedAt: new Date() }
        })
      )
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error reordenando tareas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
