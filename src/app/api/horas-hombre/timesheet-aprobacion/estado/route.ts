import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getISOWeek } from '@/lib/utils/timesheetAprobacion'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const semana = searchParams.get('semana')
    const todas = searchParams.get('todas') // If 'true', return all weeks for the user

    // Return all approval statuses for the user (used by Mis Registros page)
    if (todas === 'true') {
      const aprobaciones = await prisma.timesheetAprobacion.findMany({
        where: { usuarioId: session.user.id },
        select: {
          semana: true,
          estado: true,
        },
        orderBy: { semana: 'desc' },
      })

      const mapa: Record<string, string> = {}
      for (const a of aprobaciones) {
        mapa[a.semana] = a.estado
      }

      return NextResponse.json({ aprobaciones: mapa })
    }

    // Single week query
    const semanaQuery = semana || getISOWeek(new Date())

    const aprobacion = await prisma.timesheetAprobacion.findUnique({
      where: {
        usuarioId_semana: {
          usuarioId: session.user.id,
          semana: semanaQuery,
        },
      },
      include: {
        aprobadoPor: { select: { name: true } },
      },
    })

    if (!aprobacion) {
      return NextResponse.json({
        estado: 'borrador',
        semana: semanaQuery,
        totalHoras: 0,
        aprobadoPor: null,
        motivoRechazo: null,
        fechaEnvio: null,
        fechaResolucion: null,
      })
    }

    return NextResponse.json({
      id: aprobacion.id,
      estado: aprobacion.estado,
      semana: aprobacion.semana,
      totalHoras: aprobacion.totalHoras,
      aprobadoPor: aprobacion.aprobadoPor?.name || null,
      motivoRechazo: aprobacion.motivoRechazo,
      fechaEnvio: aprobacion.fechaEnvio,
      fechaResolucion: aprobacion.fechaResolucion,
    })
  } catch (error) {
    console.error('Error obteniendo estado timesheet:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
