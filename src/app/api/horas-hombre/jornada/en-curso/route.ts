/**
 * API para listar jornadas de campo en curso (estado='iniciado'), para el selector
 * del botón "Requerimiento del día" en Gastos.
 *
 * Cualquier usuario autenticado puede consultarla (sin restricción de rol/supervisor),
 * a diferencia de /api/horas-hombre/jornada/todas que está restringida a roles de
 * supervisión.
 *
 * GET /api/horas-hombre/jornada/en-curso
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const jornadas = await prisma.registroHorasCampo.findMany({
      where: { estado: 'iniciado' },
      include: {
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            clienteId: true,
            cliente: { select: { id: true, nombre: true } },
          },
        },
        tareas: {
          select: {
            miembros: {
              select: {
                usuarioId: true,
                usuario: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { fechaTrabajo: 'desc' },
    })

    // cantidadMiembros/miembros se calculan sobre TODAS las tareas (incluida la
    // placeholder "Asistencia (auto)"), para reflejar a quienes marcaron ingreso
    // aunque aún no tengan horas cargadas en una tarea real.
    const data = jornadas.map(j => {
      const miembrosMap = new Map<string, { userId: string; nombre: string | null }>()
      for (const t of j.tareas) {
        for (const m of t.miembros) {
          if (!miembrosMap.has(m.usuarioId)) {
            miembrosMap.set(m.usuarioId, { userId: m.usuarioId, nombre: m.usuario.name })
          }
        }
      }
      const miembros = Array.from(miembrosMap.values())

      return {
        id: j.id,
        fechaTrabajo: j.fechaTrabajo,
        proyecto: j.proyecto,
        cantidadMiembros: miembros.length,
        miembros,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('❌ JORNADA EN-CURSO Error:', error)
    return NextResponse.json(
      { error: 'Error obteniendo jornadas en curso' },
      { status: 500 }
    )
  }
}
