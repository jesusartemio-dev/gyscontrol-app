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
      const [aprobaciones, registrosPorSemana] = await Promise.all([
        prisma.timesheetAprobacion.findMany({
          where: { usuarioId: session.user.id },
          select: { semana: true, estado: true },
          orderBy: { semana: 'desc' },
        }),
        // Find all weeks with hours to detect "sin_enviar"
        prisma.registroHoras.findMany({
          where: {
            usuarioId: session.user.id,
            origen: { in: ['oficina', 'campo'] },
          },
          select: { fechaTrabajo: true, horasTrabajadas: true },
        }),
      ])

      const mapa: Record<string, string> = {}
      for (const a of aprobaciones) {
        mapa[a.semana] = a.estado
      }

      // Group hours by ISO week to find weeks without TimesheetAprobacion
      const horasPorSemana: Record<string, number> = {}
      for (const r of registrosPorSemana) {
        const sem = getISOWeek(new Date(r.fechaTrabajo))
        horasPorSemana[sem] = (horasPorSemana[sem] || 0) + r.horasTrabajadas
      }

      // Build pendientes: weeks with hours but no TimesheetAprobacion or borrador/rechazado
      const pendientes: { semana: string; horas: number; estado: string }[] = []
      for (const [sem, horas] of Object.entries(horasPorSemana)) {
        if (horas <= 0) continue
        const estado = mapa[sem]
        if (!estado) {
          // No TimesheetAprobacion at all
          pendientes.push({ semana: sem, horas: Math.round(horas * 100) / 100, estado: 'sin_enviar' })
        } else if (estado === 'borrador') {
          pendientes.push({ semana: sem, horas: Math.round(horas * 100) / 100, estado: 'borrador' })
        } else if (estado === 'rechazado') {
          pendientes.push({ semana: sem, horas: Math.round(horas * 100) / 100, estado: 'rechazado' })
        }
      }
      // Sort by week descending
      pendientes.sort((a, b) => b.semana.localeCompare(a.semana))

      return NextResponse.json({ aprobaciones: mapa, pendientes })
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
