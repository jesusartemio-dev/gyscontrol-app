/**
 * GET /api/recursos/por-usuario/[userId]
 *
 * Devuelve los recursos en los que participa un usuario (via Empleado → RecursoComposicion).
 * Uso: auto-llenar el campo "Recurso" en el form de editar tarea cuando se selecciona un Responsable.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { userId } = await context.params

    // Empleado asociado al user (1:1)
    const empleado = await prisma.empleado.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!empleado) {
      return NextResponse.json({ recursos: [] })
    }

    // Composiciones activas del empleado → traer el recurso
    const composiciones = await prisma.recursoComposicion.findMany({
      where: { empleadoId: empleado.id, activo: true },
      include: {
        recurso: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            costoHoraProyecto: true,
            activo: true,
          },
        },
      },
    })

    const recursos = composiciones
      .filter((c) => c.recurso?.activo)
      .map((c) => ({
        id: c.recurso.id,
        nombre: c.recurso.nombre,
        tipo: c.recurso.tipo,
        costoHoraProyecto: c.recurso.costoHoraProyecto,
        rol: c.rol || null,
      }))

    return NextResponse.json({ recursos })
  } catch (error) {
    console.error('Error obteniendo recursos por usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
