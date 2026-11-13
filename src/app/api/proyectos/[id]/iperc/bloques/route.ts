import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirBloques } from '@/lib/iperc/construirBloques'
import { claveLinea } from '@/lib/iperc/construirEstructura'

/**
 * Los bloques con lo que de verdad van a generar.
 *
 * `tareaIds` son tareas del cronograma, y despues de unir o fusionar varias
 * apuntan a una sola linea de la estructura: el panel decia "68 tareas"
 * cuando quedaban 61 lineas, y no decia cuantas filas iban a salir, que es lo
 * que importa para saber cuanto va a tardar.
 */
async function conEstructura(ipercId: string) {
  const [bloques, items, filas] = await Promise.all([
    prisma.ipercBloque.findMany({ where: { ipercId }, orderBy: { numero: 'asc' } }),
    prisma.ipercEstructuraItem.findMany({
      where: { ipercId, origen: { not: 'fija' } },
      select: {
        proceso: true, actividad: true, tarea: true,
        peligrosPrevistos: true, tareaIds: true,
      },
    }),
    prisma.ipercFila.findMany({
      where: { ipercId },
      select: { proceso: true, actividad: true, tarea: true },
    }),
  ])

  const conFila = new Set(filas.map(claveLinea))

  return bloques.map(b => {
    const suyos = items.filter(i => i.tareaIds.some(t => b.tareaIds.includes(t)))
    // Sin estructura (IPERC de antes de que existiera) se informa el cronograma.
    const hayEstructura = suyos.length > 0
    return {
      id: b.id,
      numero: b.numero,
      nombre: b.nombre,
      totalTareas: hayEstructura ? suyos.length : b.tareaIds.length,
      totalActividades: b.actividadIds.length,
      filasPrevistas: hayEstructura
        ? suyos.reduce((n, i) => n + i.peligrosPrevistos, 0)
        : null,
      lineasHechas: hayEstructura ? suyos.filter(i => conFila.has(claveLinea(i))).length : null,
      estado: b.estado,
      filasGeneradas: b.filasGeneradas,
      errorMensaje: b.errorMensaje,
      generadoEn: b.generadoEn,
    }
  })
}

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

async function autorizar(req: NextRequest, proyectoId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: Response.json({ error: 'No autorizado' }, { status: 401 }) }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) return { error: Response.json({ error: 'Proyecto no encontrado' }, { status: 404 }) }

  const userId = session.user.id
  const esAsignado =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId

  if (!tieneRol(session, ROLES_CON_ACCESO) && !esAsignado) {
    return { error: Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 }) }
  }
  return { userId }
}

/** GET — bloques definidos, con su estado. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(req, proyectoId)
  if (auth.error) return auth.error

  const iperc = await prisma.iperc.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!iperc) return Response.json({ bloques: [] })

  return Response.json({
    bloques: await conEstructura(iperc.id),
    lineasFijas: await prisma.ipercEstructuraItem.count({
      where: { ipercId: iperc.id, origen: 'fija' },
    }),
  })
}

/**
 * POST — define (o redefine) la estructura de bloques a partir de los EDTs
 * elegidos. No llama a la IA: solo lee el cronograma y parte el trabajo.
 *
 * Redefinir borra los bloques anteriores pero NO las filas ya generadas: si
 * agregas un EDT a la selección, lo que ya evaluaste sigue ahí.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(req, proyectoId)
  if (auth.error) return auth.error

  const iperc = await prisma.iperc.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!iperc) {
    return Response.json({ error: 'El IPERC no existe — crearlo primero' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const edtIds: string[] = Array.isArray(body.edtIds)
    ? body.edtIds.filter((x: unknown) => typeof x === 'string')
    : []
  if (edtIds.length === 0) {
    return Response.json({ error: 'Selecciona al menos un EDT' }, { status: 400 })
  }

  const propuestos = await construirBloques(proyectoId, edtIds)
  if (propuestos.length === 0) {
    return Response.json({ error: 'Los EDTs seleccionados no tienen tareas' }, { status: 400 })
  }

  // Qué tareas ya tienen filas: un bloque que las cubre entera arranca como
  // listo, para no rehacer trabajo al redefinir la estructura.
  const filas = await prisma.ipercFila.findMany({
    where: { ipercId: iperc.id },
    select: { tareaCronogramaRefId: true },
  })
  const conFilas = new Set(filas.map(f => f.tareaCronogramaRefId).filter(Boolean) as string[])

  await prisma.$transaction([
    prisma.ipercBloque.deleteMany({ where: { ipercId: iperc.id } }),
    ...propuestos.map(b => {
      const cubiertas = b.tareaIds.filter(t => conFilas.has(t)).length
      return prisma.ipercBloque.create({
        data: {
          ipercId: iperc.id,
          numero: b.numero,
          nombre: b.nombre,
          edtIds: b.edtIds,
          actividadIds: b.actividadIds,
          tareaIds: b.tareaIds,
          estado: cubiertas === b.tareaIds.length ? 'listo' : 'pendiente',
          filasGeneradas: cubiertas,
          updatedAt: new Date(),
        },
      })
    }),
  ])

  return Response.json({
    bloques: await conEstructura(iperc.id),
    lineasFijas: await prisma.ipercEstructuraItem.count({
      where: { ipercId: iperc.id, origen: 'fija' },
    }),
  })
}
