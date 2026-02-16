import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWeekRange } from '@/lib/utils/timesheetAprobacion'
import { EstadoTimesheet } from '@prisma/client'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const estadoParam = searchParams.get('estado') || 'enviado'
    const usuarioId = searchParams.get('usuarioId')
    const semanaDesde = searchParams.get('semanaDesde') // e.g. "2026-W05"
    const semanaHasta = searchParams.get('semanaHasta') // e.g. "2026-W08"

    // Build where clause
    const where: Record<string, unknown> = {}
    if (estadoParam !== 'todos') {
      where.estado = estadoParam as EstadoTimesheet
    }
    if (usuarioId) {
      where.usuarioId = usuarioId
    }
    if (semanaDesde || semanaHasta) {
      where.semana = {}
      if (semanaDesde) (where.semana as Record<string, string>).gte = semanaDesde
      if (semanaHasta) (where.semana as Record<string, string>).lte = semanaHasta
    }

    const aprobaciones = await prisma.timesheetAprobacion.findMany({
      where,
      include: {
        usuario: { select: { id: true, name: true, email: true } },
        aprobadoPor: { select: { name: true } },
      },
      orderBy: [
        { estado: 'asc' },
        { fechaEnvio: 'desc' },
      ],
    })

    // Enrich with registration details per week
    const result = await Promise.all(
      aprobaciones.map(async (a) => {
        const { inicio, fin } = getWeekRange(a.semana)

        // Get registrations grouped by project for this user+week (oficina only)
        const registros = await prisma.registroHoras.findMany({
          where: {
            usuarioId: a.usuarioId,
            origen: 'oficina',
            fechaTrabajo: { gte: inicio, lte: fin },
          },
          select: {
            id: true,
            fechaTrabajo: true,
            horasTrabajadas: true,
            descripcion: true,
            nombreServicio: true,
            proyecto: { select: { id: true, codigo: true, nombre: true } },
            proyectoEdt: { select: { nombre: true } },
            proyectoTarea: { select: { nombre: true } },
          },
          orderBy: { fechaTrabajo: 'asc' },
        })

        // Group hours by project
        const porProyecto: Record<string, { codigo: string; nombre: string; horas: number }> = {}
        for (const r of registros) {
          const pid = r.proyecto.id
          if (!porProyecto[pid]) {
            porProyecto[pid] = { codigo: r.proyecto.codigo, nombre: r.proyecto.nombre, horas: 0 }
          }
          porProyecto[pid].horas += r.horasTrabajadas
        }

        // Count unique days
        const diasUnicos = new Set(registros.map(r => new Date(r.fechaTrabajo).toISOString().slice(0, 10)))

        return {
          id: a.id,
          semana: a.semana,
          estado: a.estado,
          totalHoras: a.totalHoras,
          fechaEnvio: a.fechaEnvio,
          fechaResolucion: a.fechaResolucion,
          motivoRechazo: a.motivoRechazo,
          usuario: a.usuario,
          aprobadoPor: a.aprobadoPor?.name || null,
          diasTrabajados: diasUnicos.size,
          proyectos: Object.values(porProyecto),
          registros,
        }
      })
    )

    return NextResponse.json({ aprobaciones: result })
  } catch (error) {
    console.error('Error obteniendo pendientes:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
