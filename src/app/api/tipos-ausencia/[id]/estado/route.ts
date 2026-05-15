import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { TipoAusenciaEstadoSchema } from '@/lib/validators/ausencias'

const ROLES_ADMIN = ['admin', 'administracion']

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/tipos-ausencia/:id/estado — toggle activo
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ADMIN.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await context.params
    const existing = await prisma.tipoAusencia.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tipo de ausencia no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { activo } = TipoAusenciaEstadoSchema.parse(body)

    // Si se desactiva, advertir si hay solicitudes pendientes/aprobadas
    let advertencia: string | undefined
    if (!activo) {
      const solicitudesPendientes = await prisma.solicitudAusencia.count({
        where: {
          tipoAusenciaId: id,
          estado: { in: ['pendiente', 'aprobada', 'en_curso'] },
        },
      })
      if (solicitudesPendientes > 0) {
        advertencia = `Hay ${solicitudesPendientes} solicitud(es) activas con este tipo. El tipo quedará inactivo pero esas solicitudes no se cancelan automáticamente.`
      }
    }

    const updated = await prisma.tipoAusencia.update({
      where: { id },
      data: { activo, updatedAt: new Date() },
    })

    return NextResponse.json({ ...updated, advertencia })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[PATCH /api/tipos-ausencia/:id/estado]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
