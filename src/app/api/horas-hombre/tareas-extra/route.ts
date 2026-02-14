/**
 * API para listar tareas extra [EXTRA] de un proyecto
 * GET /api/horas-hombre/tareas-extra?proyectoId=X&proyectoEdtId=Y
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')

    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId requerido' }, { status: 400 })
    }

    // Buscar tareas extra (marcadas con [EXTRA]) del cronograma de ejecución
    const tareasExtra = await prisma.proyectoTarea.findMany({
      where: {
        descripcion: { startsWith: '[EXTRA]' },
        proyectoEdt: {
          proyectoId,
          proyectoCronograma: { tipo: 'ejecucion' }
        }
      },
      select: {
        id: true,
        nombre: true,
        estado: true,
        porcentajeCompletado: true,
        proyectoEdt: {
          select: { nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(
      tareasExtra.map(t => ({
        id: t.id,
        nombre: t.nombre,
        estado: t.estado,
        porcentaje: t.porcentajeCompletado,
        edtNombre: t.proyectoEdt?.nombre
      }))
    )
  } catch (error) {
    console.error('Error fetching tareas extra:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
