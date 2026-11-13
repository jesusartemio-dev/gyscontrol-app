import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirEstructura } from '@/lib/iperc/construirEstructura'
import { detectarFusiones, fusionarActividades } from '@/lib/iperc/reducirEstructura'

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
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId

  if (!tieneRol(session, ROLES_CON_ACCESO) && !esAsignado) {
    return { error: Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 }) }
  }
  return { userId }
}

async function devolverEstructura(ipercId: string) {
  const [items, sugerencias] = await Promise.all([
    prisma.ipercEstructuraItem.findMany({ where: { ipercId }, orderBy: { orden: 'asc' } }),
    detectarFusiones(ipercId),
  ])
  return Response.json({
    items: items.map(i => ({
      id: i.id,
      orden: i.orden,
      proceso: i.proceso,
      actividad: i.actividad,
      tarea: i.tarea,
      peligrosPrevistos: i.peligrosPrevistos,
      origen: i.origen,
      totalTareasCronograma: i.tareaIds.length,
      estado: i.estado,
      filasGeneradas: i.filasGeneradas,
    })),
    totalFilasPrevistas: items.reduce((n, i) => n + i.peligrosPrevistos, 0),
    sugerencias,
  })
}

/** GET — la estructura tal como está. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(proyectoId)
  if (auth.error) return auth.error

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return Response.json({ items: [], totalFilasPrevistas: 0 })

  return devolverEstructura(iperc.id)
}

/**
 * POST — arma la estructura desde el cronograma y el catálogo de actividades
 * fijas. No llama a la IA: solo lista qué se va a analizar.
 *
 * Rearmar descarta lo que se haya editado, así que solo se permite si no hay
 * nada generado todavía; con `forzar` se rehace igual.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(proyectoId)
  if (auth.error) return auth.error

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return Response.json({ error: 'El IPERC no existe — crearlo primero' }, { status: 409 })

  const body = await req.json().catch(() => ({}))

  if (body.accion === 'unir') return unir(iperc.id, body)
  if (body.accion === 'fusionar-actividades') return fusionar(iperc.id, body)

  const edtIds: string[] = Array.isArray(body.edtIds)
    ? body.edtIds.filter((x: unknown) => typeof x === 'string')
    : []
  if (edtIds.length === 0) {
    return Response.json({ error: 'Selecciona al menos un EDT' }, { status: 400 })
  }

  const yaGenerado = await prisma.ipercEstructuraItem.count({
    where: { ipercId: iperc.id, estado: 'generada' },
  })
  if (yaGenerado > 0 && !body.forzar) {
    return Response.json(
      { error: `Hay ${yaGenerado} tarea(s) ya generadas. Rearmar la estructura las descarta.`, requiereForzar: true },
      { status: 409 },
    )
  }

  const propuestos = await construirEstructura(proyectoId, edtIds)
  if (propuestos.length === 0) {
    return Response.json({ error: 'Los EDTs seleccionados no tienen tareas' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.ipercEstructuraItem.deleteMany({ where: { ipercId: iperc.id } }),
    prisma.ipercEstructuraItem.createMany({
      data: propuestos.map(p => ({
        ipercId: iperc.id,
        orden: p.orden,
        proceso: p.proceso,
        actividad: p.actividad,
        tarea: p.tarea,
        peligrosPrevistos: p.peligrosPrevistos,
        origen: p.origen,
        catalogoActividadFijaId: p.catalogoActividadFijaId,
        tareaIds: p.tareaIds,
        actividadCronogramaRefId: p.actividadCronogramaRefId,
        updatedAt: new Date(),
      })),
    }),
  ])

  return devolverEstructura(iperc.id)
}

/**
 * Une varias tareas en una. Se queda la primera por orden —su nombre y sus
 * referencias al cronograma— y absorbe las tareas de las demás, para que el
 * trabajo del cronograma siga trazado aunque en el IPERC sea una sola línea.
 *
 * Los peligros previstos no se suman: unir dos tareas parecidas es
 * justamente decir que comparten los mismos peligros. Queda el mayor de los
 * dos, que se puede ajustar después.
 */
async function unir(ipercId: string, body: { itemIds?: unknown; nombre?: unknown }) {
  const itemIds: string[] = Array.isArray(body.itemIds)
    ? body.itemIds.filter((x: unknown) => typeof x === 'string')
    : []
  if (itemIds.length < 2) {
    return Response.json({ error: 'Elige al menos dos tareas para unir' }, { status: 400 })
  }

  const items = await prisma.ipercEstructuraItem.findMany({
    where: { ipercId, id: { in: itemIds } },
    orderBy: { orden: 'asc' },
  })
  if (items.length !== itemIds.length) {
    return Response.json({ error: 'Alguna tarea ya no está' }, { status: 404 })
  }
  if (new Set(items.map(i => i.actividad)).size > 1) {
    return Response.json(
      { error: 'Solo se unen tareas de la misma actividad: las tareas pertenecen a una actividad y mezclarlas pierde ese orden' },
      { status: 400 },
    )
  }

  const principal = items[0]
  const resto = items.slice(1)
  const nombre = typeof body.nombre === 'string' && body.nombre.trim()
    ? body.nombre.trim()
    : principal.tarea

  await prisma.$transaction([
    prisma.ipercEstructuraItem.update({
      where: { id: principal.id },
      data: {
        tarea: nombre,
        tareaIds: [...new Set(items.flatMap(i => i.tareaIds))],
        peligrosPrevistos: Math.max(...items.map(i => i.peligrosPrevistos)),
        updatedAt: new Date(),
      },
    }),
    prisma.ipercEstructuraItem.deleteMany({ where: { id: { in: resto.map(i => i.id) } } }),
  ])

  return devolverEstructura(ipercId)
}

/**
 * Fusiona varias actividades que repiten el mismo trabajo en una sola.
 *
 * Para el cronograma el Tramo 1 y el Tramo 2 son trabajos distintos, porque se
 * ejecutan y se avanzan por separado. Para el IPERC son el mismo análisis: los
 * peligros de armar un andamio no cambian por el tramo.
 */
async function fusionar(ipercId: string, body: { itemIds?: unknown; titulo?: unknown }) {
  const itemIds: string[] = Array.isArray(body.itemIds)
    ? body.itemIds.filter((x: unknown) => typeof x === 'string')
    : []
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  if (itemIds.length < 2) {
    return Response.json({ error: 'Elige al menos dos actividades' }, { status: 400 })
  }
  if (!titulo) {
    return Response.json({ error: 'Falta el título de la actividad fusionada' }, { status: 400 })
  }

  try {
    await fusionarActividades(ipercId, itemIds, titulo)
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'No se pudo fusionar' }, { status: 400 })
  }
  return devolverEstructura(ipercId)
}

/** PATCH — edita una línea: nombre, actividad, proceso o cuántos peligros. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(proyectoId)
  if (auth.error) return auth.error

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return Response.json({ error: 'El IPERC no existe' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const itemId = String(body.id ?? '')
  if (!itemId) return Response.json({ error: 'Falta el id' }, { status: 400 })

  const actual = await prisma.ipercEstructuraItem.findFirst({
    where: { id: itemId, ipercId: iperc.id },
    select: { id: true },
  })
  if (!actual) return Response.json({ error: 'Esa línea no es de este IPERC' }, { status: 404 })

  const data: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.tarea === 'string' && body.tarea.trim()) data.tarea = body.tarea.trim()
  if (typeof body.actividad === 'string' && body.actividad.trim()) data.actividad = body.actividad.trim()
  if (typeof body.proceso === 'string' && body.proceso.trim()) data.proceso = body.proceso.trim()
  if (body.peligrosPrevistos != null) {
    const n = Number(body.peligrosPrevistos)
    // Más de diez peligros en una tarea es señal de que hay que partirla, no
    // de que la tarea sea así. El SSOMA, en CJM50, nunca pasó de siete.
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return Response.json({ error: 'Los peligros van de 1 a 10' }, { status: 400 })
    }
    data.peligrosPrevistos = n
  }

  await prisma.ipercEstructuraItem.update({ where: { id: itemId }, data })
  return devolverEstructura(iperc.id)
}

/** DELETE ?itemId= — saca una línea de la estructura. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id: proyectoId } = await ctx.params
  const auth = await autorizar(proyectoId)
  if (auth.error) return auth.error

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return Response.json({ error: 'El IPERC no existe' }, { status: 404 })

  const itemId = req.nextUrl.searchParams.get('itemId') ?? ''
  if (!itemId) return Response.json({ error: 'Falta itemId' }, { status: 400 })

  const { count } = await prisma.ipercEstructuraItem.deleteMany({
    where: { id: itemId, ipercId: iperc.id },
  })
  if (count === 0) return Response.json({ error: 'Esa línea no es de este IPERC' }, { status: 404 })

  return devolverEstructura(iperc.id)
}
