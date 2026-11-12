import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { detectarGrupos, calcularPrevia, aplicar } from '@/lib/iperc/actividadesSimilares'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

async function autorizar(proyectoId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: Response.json({ error: 'No autorizado' }, { status: 401 }) }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) return { error: Response.json({ error: 'Proyecto no encontrado' }, { status: 404 }) }

  const userId = session.user.id
  const esAsignado =
    proyecto.gestorId === userId || proyecto.supervisorId === userId ||
    proyecto.liderId === userId || proyecto.comercialId === userId
  if (!tieneRol(session, ROLES_CON_ACCESO) && !esAsignado) {
    return { error: Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 }) }
  }

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return { error: Response.json({ error: 'El proyecto no tiene IPERC' }, { status: 404 }) }
  return { ipercId: iperc.id }
}

/** GET — grupos de actividades que son el mismo trabajo sobre equipos distintos. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(proyectoId)
  if (auth.error) return auth.error

  const grupos = await detectarGrupos(auth.ipercId!)
  return Response.json({ grupos })
}

/**
 * POST — previa o aplicación.
 *
 * body: { accion: 'unificar'|'fusionar', referencia, actividades[], confirmar? }
 * Sin `confirmar` devuelve solo la previa: nada se escribe.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(proyectoId)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const accion = body?.accion === 'fusionar' ? 'fusionar' : 'unificar'
  const referencia = String(body?.referencia ?? '')
  const actividades: string[] = Array.isArray(body?.actividades)
    ? body.actividades.filter((x: unknown) => typeof x === 'string')
    : []

  if (!referencia || actividades.length < 2) {
    return Response.json({ error: 'Indica la referencia y al menos dos actividades' }, { status: 400 })
  }
  if (!actividades.includes(referencia)) {
    return Response.json({ error: 'La referencia debe ser una de las actividades del grupo' }, { status: 400 })
  }

  const previa = await calcularPrevia(auth.ipercId!, accion, referencia, actividades)
  if (!body?.confirmar) return Response.json({ previa })

  const r = await aplicar(auth.ipercId!, accion, referencia, actividades)
  return Response.json({ previa, aplicado: true, ...r })
}
