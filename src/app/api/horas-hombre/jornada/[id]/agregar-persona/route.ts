/**
 * Agrega una persona a una jornada de campo en curso SIN pasar por el flujo de
 * "Agregar Tarea" (que requiere elegir/crear una tarea del cronograma) y sin
 * depender de que haya marcado asistencia por QR.
 *
 * Usa el mismo mecanismo que el check-in automático: la persona queda como
 * miembro (horas=0) de la tarea placeholder "Asistencia (auto)" de la jornada,
 * lista para que el supervisor le asigne horas reales después (editando esa
 * tarea) o para que cuente correctamente en el "Requerimiento del día".
 *
 * Pensado para casos donde alguien no pudo marcar asistencia (p. ej. problemas
 * de GPS/permisos en su celular) pero sí está presente en la jornada.
 *
 * POST /api/horas-hombre/jornada/[id]/agregar-persona
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMiembroJornadaCampo } from '@/lib/services/asistencia'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado - debe iniciar sesión' }, { status: 401 })
    }

    const { id: jornadaId } = await context.params
    const body = await request.json()
    const usuarioId: string | undefined = body?.usuarioId

    if (!usuarioId) {
      return NextResponse.json({ error: 'Debe especificar la persona a agregar' }, { status: 400 })
    }

    const jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaId },
      select: { id: true, estado: true, supervisorId: true },
    })
    if (!jornada) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 })
    }
    if (jornada.supervisorId !== session.user.id) {
      return NextResponse.json({ error: 'No tienes permiso para modificar esta jornada' }, { status: 403 })
    }
    if (jornada.estado !== 'iniciado') {
      return NextResponse.json({ error: 'Solo se puede agregar personas a jornadas en estado "iniciado"' }, { status: 400 })
    }

    const usuario = await prisma.user.findUnique({ where: { id: usuarioId }, select: { id: true, name: true } })
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    await prisma.$transaction((tx) => registrarMiembroJornadaCampo(tx, jornadaId, usuarioId))

    return NextResponse.json({
      success: true,
      message: `${usuario.name || 'Persona'} agregada a la jornada`,
    })
  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al agregar persona:', error)
    return NextResponse.json({ error: 'Error agregando persona a la jornada' }, { status: 500 })
  }
}
