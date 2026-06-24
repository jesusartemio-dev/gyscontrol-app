import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la tarea existe y el usuario tiene acceso
    const tarea = await prisma.proyectoTarea.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        responsableId: true,
        horasEstimadas: true,
        horasReales: true,
        personasEstimadas: true,
        porcentajeCompletado: true,
        estado: true
      }
    })

    if (!tarea) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    const registros = await prisma.registroHoras.findMany({
      where: { proyectoTareaId: id },
      select: {
        id: true,
        fechaTrabajo: true,
        horasTrabajadas: true,
        descripcion: true,
        origen: true,
        user: { select: { id: true, name: true } }
      },
      orderBy: { fechaTrabajo: 'desc' }
    })

    const totalHoras = registros.reduce((s, r) => s + r.horasTrabajadas, 0)

    return NextResponse.json({
      success: true,
      data: {
        tarea: {
          id: tarea.id,
          nombre: tarea.nombre,
          responsableId: tarea.responsableId,
          horasPlan: tarea.horasEstimadas
            ? Number(tarea.horasEstimadas) * (tarea.personasEstimadas || 1)
            : 0,
          horasReales: tarea.horasReales ? Number(tarea.horasReales) : 0,
          progreso: tarea.porcentajeCompletado ?? 0,
          estado: tarea.estado
        },
        registros: registros.map(r => ({
          id: r.id,
          fecha: r.fechaTrabajo,
          usuarioId: r.user?.id ?? null,
          usuarioNombre: r.user?.name ?? 'Desconocido',
          horas: r.horasTrabajadas,
          descripcion: r.descripcion ?? '',
          origen: r.origen ?? 'oficina'
        })),
        totalHoras: Math.round(totalHoras * 10) / 10
      }
    })
  } catch (error) {
    console.error('Error obteniendo horas de tarea:', error)
    return NextResponse.json({ error: 'Error interno', success: false }, { status: 500 })
  }
}
