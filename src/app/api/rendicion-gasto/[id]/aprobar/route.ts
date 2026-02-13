import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rolesAprobadores = ['admin', 'gerente', 'gestor', 'coordinador']
    if (!rolesAprobadores.includes(session.user.role)) {
      return NextResponse.json({ error: 'No tienes permiso para aprobar rendiciones' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.rendicionGasto.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }

    if (existing.estado !== 'enviado') {
      return NextResponse.json({ error: 'Solo se puede aprobar una rendición en estado enviado' }, { status: 400 })
    }

    // Aprobar rendición
    const rendicion = await prisma.rendicionGasto.update({
      where: { id },
      data: {
        estado: 'aprobado',
        aprobadorId: session.user.id,
        fechaAprobacion: new Date(),
        updatedAt: new Date(),
      },
    })

    // Liquidación automática del anticipo vinculado
    if (existing.solicitudAnticipoId) {
      const anticipo = await prisma.solicitudAnticipo.findUnique({
        where: { id: existing.solicitudAnticipoId },
      })

      if (anticipo) {
        // Sumar todas las rendiciones aprobadas de este anticipo
        const rendicionesAprobadas = await prisma.rendicionGasto.findMany({
          where: {
            solicitudAnticipoId: anticipo.id,
            estado: 'aprobado',
          },
          select: { montoTotal: true },
        })

        const totalRendido = rendicionesAprobadas.reduce((sum, r) => sum + r.montoTotal, 0)
        const montoPendiente = anticipo.monto - totalRendido

        const updateAnticipo: any = {
          montoLiquidado: totalRendido,
          montoPendiente: Math.max(0, montoPendiente),
          updatedAt: new Date(),
        }

        // Si ya se rindió todo o más, marcar como liquidado
        if (montoPendiente <= 0) {
          updateAnticipo.estado = 'liquidado'
        }

        await prisma.solicitudAnticipo.update({
          where: { id: anticipo.id },
          data: updateAnticipo,
        })
      }
    }

    return NextResponse.json(rendicion)
  } catch (error) {
    console.error('Error al aprobar rendición:', error)
    return NextResponse.json({ error: 'Error al aprobar rendición' }, { status: 500 })
  }
}
