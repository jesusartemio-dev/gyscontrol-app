import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWeekRange } from '@/lib/utils/timesheetAprobacion'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { semana } = body as { semana: string }

    if (!semana || !/^\d{4}-W\d{2}$/.test(semana)) {
      return NextResponse.json({ error: 'Formato de semana inválido. Use YYYY-Www' }, { status: 400 })
    }

    // Check if already sent or approved
    const existing = await prisma.timesheetAprobacion.findUnique({
      where: {
        usuarioId_semana: {
          usuarioId: session.user.id,
          semana,
        },
      },
    })

    if (existing?.estado === 'enviado') {
      return NextResponse.json({ error: 'Esta semana ya fue enviada y está pendiente de aprobación' }, { status: 400 })
    }
    if (existing?.estado === 'aprobado') {
      return NextResponse.json({ error: 'Esta semana ya fue aprobada' }, { status: 400 })
    }

    // Calculate total office hours for this week
    const { inicio, fin } = getWeekRange(semana)
    const totalHorasResult = await prisma.registroHoras.aggregate({
      where: {
        usuarioId: session.user.id,
        origen: 'oficina',
        fechaTrabajo: {
          gte: inicio,
          lte: fin,
        },
      },
      _sum: { horasTrabajadas: true },
      _count: true,
    })

    const totalHoras = totalHorasResult._sum.horasTrabajadas || 0
    const totalRegistros = totalHorasResult._count

    if (totalRegistros === 0) {
      return NextResponse.json({ error: 'No hay horas de oficina registradas en esta semana' }, { status: 400 })
    }

    // Upsert: create or update (for rechazado → enviado re-send)
    const aprobacion = await prisma.timesheetAprobacion.upsert({
      where: {
        usuarioId_semana: {
          usuarioId: session.user.id,
          semana,
        },
      },
      create: {
        usuarioId: session.user.id,
        semana,
        estado: 'enviado',
        totalHoras,
        fechaEnvio: new Date(),
        updatedAt: new Date(),
      },
      update: {
        estado: 'enviado',
        totalHoras,
        fechaEnvio: new Date(),
        motivoRechazo: null,
        aprobadoPorId: null,
        fechaResolucion: null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: aprobacion.id,
      estado: aprobacion.estado,
      semana: aprobacion.semana,
      totalHoras: aprobacion.totalHoras,
      message: 'Semana enviada para aprobación',
    })
  } catch (error) {
    console.error('Error enviando timesheet:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
