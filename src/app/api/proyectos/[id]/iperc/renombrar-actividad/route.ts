import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { limpiarNombre } from '@/lib/iperc/construirEstructura'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'seguridad']

/**
 * POST — renombra un proceso o una actividad.
 *
 * Cada nombre tiene su alcance y no es el mismo:
 *
 *  - el PROCESO alcanza a todas sus actividades. "ACTIVIDADES GENERALES" es
 *    el encabezado de un bloque del IPERC, así que cambiarlo en una sola
 *    actividad partiría el bloque en dos.
 *  - la ACTIVIDAD alcanza solo a sus filas.
 *
 * Toca también la estructura, porque la línea se reconoce por proceso +
 * actividad + tarea: si solo se renombraran las filas, la estructura dejaría
 * de encontrarlas y volverían a figurar como pendientes.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const userId = session.user.id
  const esAsignado =
    proyecto.gestorId === userId || proyecto.supervisorId === userId ||
    proyecto.liderId === userId || proyecto.comercialId === userId
  if (!tieneRol(session, ROLES_CON_ACCESO) && !esAsignado) {
    return Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return Response.json({ error: 'El IPERC no existe' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const proceso = limpiarNombre(String(body.proceso ?? ''))
  const actividad = limpiarNombre(String(body.actividad ?? ''))
  const nuevoProceso = limpiarNombre(String(body.nuevoProceso ?? proceso))
  const nuevaActividad = limpiarNombre(String(body.nuevaActividad ?? actividad))

  if (!proceso || !actividad) {
    return Response.json({ error: 'Falta el proceso o la actividad' }, { status: 400 })
  }
  if (!nuevoProceso || !nuevaActividad) {
    return Response.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 })
  }
  if (nuevoProceso === proceso && nuevaActividad === actividad) {
    return Response.json({ filas: 0, lineas: 0 })
  }

  const ops = []

  // El proceso primero y sobre todas sus actividades; después la actividad,
  // ya dentro del proceso nuevo.
  if (nuevoProceso !== proceso) {
    ops.push(
      prisma.ipercFila.updateMany({
        where: { ipercId: iperc.id, proceso },
        data: { proceso: nuevoProceso, updatedAt: new Date() },
      }),
      prisma.ipercEstructuraItem.updateMany({
        where: { ipercId: iperc.id, proceso },
        data: { proceso: nuevoProceso, updatedAt: new Date() },
      }),
    )
  }
  if (nuevaActividad !== actividad) {
    ops.push(
      prisma.ipercFila.updateMany({
        where: { ipercId: iperc.id, proceso: nuevoProceso, actividad },
        data: { actividad: nuevaActividad, updatedAt: new Date() },
      }),
      prisma.ipercEstructuraItem.updateMany({
        where: { ipercId: iperc.id, proceso: nuevoProceso, actividad },
        data: { actividad: nuevaActividad, updatedAt: new Date() },
      }),
    )
  }

  await prisma.$transaction(ops)

  const filas = await prisma.ipercFila.count({
    where: { ipercId: iperc.id, proceso: nuevoProceso, actividad: nuevaActividad },
  })
  const delProceso = await prisma.ipercFila.count({
    where: { ipercId: iperc.id, proceso: nuevoProceso },
  })

  return Response.json({ filas, filasDelProceso: delProceso })
}
