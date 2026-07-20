import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cargarContextoPlanTrabajo } from '@/lib/planTrabajo/cargarContexto'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/proyectos/[id]/plan-trabajo/contexto
// Devuelve TODO el contexto necesario para el módulo Plan de Trabajo
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  // Verificar acceso al proyecto
  const proyectoBase = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      id: true,
      gestorId: true,
      supervisorId: true,
      liderId: true,
      comercialId: true,
    },
  })

  if (!proyectoBase) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { id: userId, role } = session.user
  const rolesConAccesoTotal = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial', 'coordinador', 'proyectos']
  const esGestorODirectivo =
    proyectoBase.gestorId === userId ||
    proyectoBase.supervisorId === userId ||
    proyectoBase.liderId === userId ||
    proyectoBase.comercialId === userId

  if (!rolesConAccesoTotal.includes(role) && !esGestorODirectivo) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  try {
    const contexto = await cargarContextoPlanTrabajo(proyectoId)
    if (!contexto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ data: contexto })
  } catch (error) {
    console.error('[plan-trabajo/contexto] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
