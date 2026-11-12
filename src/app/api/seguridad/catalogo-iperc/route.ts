import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { limpiarCacheCatalogosIperc } from '@/lib/iperc/catalogos/desdeBD'

export const dynamic = 'force-dynamic'

const ROLES_VER = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'seguridad']
const ROLES_EDITAR = ['admin', 'gerente', 'seguridad']

type Tipo = 'peligros' | 'controles' | 'matriz'

function tipoDe(req: NextRequest): Tipo {
  const t = req.nextUrl.searchParams.get('tipo')
  return t === 'controles' ? 'controles' : t === 'matriz' ? 'matriz' : 'peligros'
}

/** GET — lista un catálogo. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_VER)) return Response.json({ error: 'Sin acceso' }, { status: 403 })

  const tipo = tipoDe(req)
  if (tipo === 'controles') {
    // Los controles se devuelven agrupados por peligro, como en la hoja del
    // Excel: un control suelto no dice para que peligro es.
    const [grupos, items] = await Promise.all([
      prisma.ipercCatalogoGrupoControl.findMany({
        orderBy: { numero: 'asc' },
        include: {
          controles: { orderBy: [{ jerarquia: 'asc' }, { orden: 'asc' }] },
        },
      }),
      prisma.ipercCatalogoControl.findMany({
        where: { grupoId: null },
        orderBy: [{ tipoPeligro: 'asc' }, { jerarquia: 'asc' }, { orden: 'asc' }],
      }),
    ])
    // `items` son los que quedaron sin grupo: vienen del catalogo viejo del
    // codigo y no figuran en la hoja.
    return Response.json({ tipo, grupos, items })
  }
  if (tipo === 'matriz') {
    const items = await prisma.ipercCatalogoMatriz.findMany({
      orderBy: [{ severidad: 'asc' }, { probabilidad: 'asc' }],
    })
    return Response.json({ tipo, items })
  }
  const items = await prisma.ipercCatalogoPeligro.findMany({
    orderBy: [{ categoria: 'asc' }, { orden: 'asc' }],
  })
  return Response.json({ tipo, items })
}

/** POST — crea una entrada. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_EDITAR)) {
    return Response.json({ error: 'Solo seguridad, gerencia o admin pueden editar el catálogo' }, { status: 403 })
  }

  const tipo = tipoDe(req)
  const body = await req.json().catch(() => ({}))

  try {
    if (tipo === 'controles') {
      const item = await prisma.ipercCatalogoControl.create({
        data: {
          tipoPeligro: String(body.tipoPeligro ?? '').trim(),
          jerarquia: String(body.jerarquia ?? '').trim(),
          texto: String(body.texto ?? '').trim(),
          orden: Number(body.orden ?? 0),
          updatedAt: new Date(),
        },
      })
      limpiarCacheCatalogosIperc()
      return Response.json({ item }, { status: 201 })
    }
    if (tipo === 'matriz') {
      return Response.json(
        { error: 'La matriz tiene sus 25 celdas fijas: se editan, no se agregan' },
        { status: 400 },
      )
    }
    const item = await prisma.ipercCatalogoPeligro.create({
      data: {
        categoria: String(body.categoria ?? '').trim(),
        peligro: String(body.peligro ?? '').trim(),
        riesgo: String(body.riesgo ?? '').trim(),
        consecuencia: String(body.consecuencia ?? '').trim(),
        orden: Number(body.orden ?? 0),
        updatedAt: new Date(),
      },
    })
    limpiarCacheCatalogosIperc()
    return Response.json({ item }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error && e.message.includes('Unique')
      ? 'Ya existe una entrada igual en el catálogo'
      : 'No se pudo crear la entrada'
    return Response.json({ error: msg }, { status: 409 })
  }
}

/** PATCH — edita una entrada. body: { id, ...campos } */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_EDITAR)) {
    return Response.json({ error: 'Solo seguridad, gerencia o admin pueden editar el catálogo' }, { status: 403 })
  }

  const tipo = tipoDe(req)
  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '')
  if (!id) return Response.json({ error: 'Falta el id' }, { status: 400 })

  const soloDefinidos = <T extends object>(o: T) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

  try {
    if (tipo === 'controles') {
      const item = await prisma.ipercCatalogoControl.update({
        where: { id },
        data: soloDefinidos({
          tipoPeligro: body.tipoPeligro,
          jerarquia: body.jerarquia,
          texto: body.texto,
          activo: body.activo,
          orden: body.orden,
        }),
      })
      limpiarCacheCatalogosIperc()
      return Response.json({ item })
    }
    if (tipo === 'matriz') {
      const item = await prisma.ipercCatalogoMatriz.update({
        where: { id },
        data: soloDefinidos({ valor: body.valor, nivel: body.nivel }),
      })
      limpiarCacheCatalogosIperc()
      return Response.json({ item })
    }
    const item = await prisma.ipercCatalogoPeligro.update({
      where: { id },
      data: soloDefinidos({
        categoria: body.categoria,
        peligro: body.peligro,
        riesgo: body.riesgo,
        consecuencia: body.consecuencia,
        activo: body.activo,
        orden: body.orden,
      }),
    })
    limpiarCacheCatalogosIperc()
    return Response.json({ item })
  } catch {
    return Response.json({ error: 'No se pudo actualizar' }, { status: 409 })
  }
}

/**
 * DELETE — borra una entrada. ?tipo=&id=
 *
 * No afecta a los IPERC ya generados: sus filas guardan el texto, no una
 * referencia al catálogo. Quitar algo del catálogo solo impide que la IA lo
 * vuelva a proponer. Para eso suele ser mejor desactivarlo que borrarlo.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_EDITAR)) {
    return Response.json({ error: 'Solo seguridad, gerencia o admin pueden editar el catálogo' }, { status: 403 })
  }

  const tipo = tipoDe(req)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'Falta el id' }, { status: 400 })
  if (tipo === 'matriz') {
    return Response.json({ error: 'Las celdas de la matriz no se borran' }, { status: 400 })
  }

  if (tipo === 'controles') await prisma.ipercCatalogoControl.delete({ where: { id } })
  else await prisma.ipercCatalogoPeligro.delete({ where: { id } })

  limpiarCacheCatalogosIperc()
  return Response.json({ ok: true })
}
