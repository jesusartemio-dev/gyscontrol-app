import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularResidual, cumpleRegla } from '@/lib/iperc/riesgoResidual'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'seguridad']

async function autorizar(proyectoId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: Response.json({ error: 'No autorizado' }, { status: 401 }) }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) return { error: Response.json({ error: 'Proyecto no encontrado' }, { status: 404 }) }

  const userId = session.user.id
  const esAsignado =
    proyecto.gestorId === userId || proyecto.supervisorId === userId ||
    proyecto.liderId === userId || proyecto.comercialId === userId

  if (!tieneRol(session, ROLES_CON_ACCESO) && !esAsignado) {
    return { error: Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 }) }
  }
  return { userId }
}

const CAMPOS = {
  id: true, numero: true, tarea: true,
  severidad: true, probabilidad: true,
  severidadResidual: true, probabilidadResidual: true,
  controlIngenieria: true, controlAdministrativo: true,
} as const

/**
 * GET — qué filas tienen el residual fuera de la regla del SSOMA.
 *
 * La app lo recalcula al guardar, así que una fila solo queda fuera si entró
 * por otro camino: una versión revisada subida desde Excel, o una fila
 * generada antes de que la regla existiera. Justo los casos en los que nadie
 * se iba a dar cuenta mirando la tabla.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(proyectoId)
  if (auth.error) return auth.error

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return Response.json({ total: 0, fuera: [] })

  const filas = await prisma.ipercFila.findMany({
    where: { ipercId: iperc.id },
    select: CAMPOS,
    orderBy: { numero: 'asc' },
  })

  const fuera = filas.filter(f => !cumpleRegla(f)).map(f => {
    const esperado = calcularResidual(
      f.severidad, f.probabilidad, f.controlIngenieria, f.controlAdministrativo,
    )
    return {
      id: f.id,
      numero: f.numero,
      tarea: f.tarea,
      actual: `S${f.severidadResidual}${f.probabilidadResidual}`,
      esperado: `S${esperado.severidadResidual}${esperado.probabilidadResidual}`,
    }
  })

  return Response.json({ total: filas.length, fuera })
}

/** POST — recalcula el residual de las filas que no cumplen. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(proyectoId)
  if (auth.error) return auth.error

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return Response.json({ error: 'El IPERC no existe' }, { status: 404 })

  const filas = await prisma.ipercFila.findMany({
    where: { ipercId: iperc.id },
    select: CAMPOS,
  })

  const arreglar = filas
    .filter(f => !cumpleRegla(f))
    .map(f => ({
      id: f.id,
      ...calcularResidual(f.severidad, f.probabilidad, f.controlIngenieria, f.controlAdministrativo),
    }))

  if (arreglar.length === 0) return Response.json({ corregidas: 0 })

  await prisma.$transaction(
    arreglar.map(x =>
      prisma.ipercFila.update({
        where: { id: x.id },
        data: {
          severidadResidual: x.severidadResidual,
          probabilidadResidual: x.probabilidadResidual,
          updatedAt: new Date(),
        },
      }),
    ),
  )

  return Response.json({ corregidas: arreglar.length })
}
