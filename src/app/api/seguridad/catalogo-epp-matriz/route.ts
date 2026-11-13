import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * La lista final de puestos por defecto, o null si el payload no la trae
 * —editar solo el nombre no debe borrar las asignaciones—.
 */
function leerPuestoIds(valor: unknown): string[] | null {
  if (!Array.isArray(valor)) return null
  return [...new Set((valor as unknown[]).map(x => String(x)).filter(Boolean))]
}

const ROLES_VER = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'seguridad']
const ROLES_EDITAR = ['admin', 'gerente', 'seguridad']

/**
 * Catálogo de EPP de la matriz (MPP). Hasta ahora solo se podía tocar
 * editando src/lib/mpp/catalogos/eppCatalogo.ts y desplegando.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_VER)) return Response.json({ error: 'Sin acceso' }, { status: 403 })

  const [items, puestos] = await Promise.all([
    prisma.mppEppCatalogo.findMany({
      orderBy: { orden: 'asc' },
      include: {
        catalogoImagen: { select: { id: true, driveFileId: true, nombre: true } },
        puestosDefault: { select: { puestoId: true } },
        _count: { select: { mppItems: true } },
      },
    }),
    // Solo los de campo: son los que pueden ser columna de una matriz de EPP.
    prisma.puesto.findMany({
      where: { vaACampo: true, activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, categoria: true },
    }),
  ])

  return Response.json({
    items: items.map(({ puestosDefault, ...resto }) => ({
      ...resto,
      puestoIdsDefault: puestosDefault.map(p => p.puestoId),
    })),
    puestos,
  })
}

/** PATCH — edita una entrada. body: { id, ...campos } */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_EDITAR)) {
    return Response.json({ error: 'Solo seguridad, gerencia o admin pueden editar el catálogo' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '')
  if (!id) return Response.json({ error: 'Falta el id' }, { status: 400 })

  const soloDefinidos = <T extends object>(o: T) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

  // Los puestos por defecto se reemplazan enteros: llega la lista final.
  const puestoIds = leerPuestoIds(body.puestoIdsDefault)

  try {
    if (puestoIds) {
      await prisma.$transaction([
        prisma.mppEppPuestoDefault.deleteMany({ where: { mppEppCatalogoId: id } }),
        prisma.mppEppPuestoDefault.createMany({
          data: puestoIds.map(puestoId => ({ mppEppCatalogoId: id, puestoId })),
          skipDuplicates: true,
        }),
      ])
    }

    const item = await prisma.mppEppCatalogo.update({
      where: { id },
      data: soloDefinidos({
        nombre: body.nombre,
        riesgo: body.riesgo,
        parteCuerpo: body.parteCuerpo,
        durabilidad: body.durabilidad,
        activo: body.activo,
        catalogoImagenId: body.catalogoImagenId,
        asignacionesDefault: body.asignacionesDefault,
      }),
    })
    return Response.json({ item })
  } catch {
    return Response.json({ error: 'No se pudo actualizar' }, { status: 409 })
  }
}

/**
 * POST — agrega un EPP al catálogo, al final.
 *
 * El `orden` ya no ata la foto a una fila de la plantilla —la imagen cuelga
 * del equipo— así que agregar deja de descolocar nada.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (!tieneRol(session, ROLES_EDITAR)) {
    return Response.json({ error: 'Solo seguridad, gerencia o admin pueden editar el catálogo' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const puestoIds = leerPuestoIds(body.puestoIdsDefault)
  const nombre = String(body.nombre ?? '').trim()
  if (!nombre) return Response.json({ error: 'Falta el nombre' }, { status: 400 })

  const ultimo = await prisma.mppEppCatalogo.findFirst({ orderBy: { orden: 'desc' }, select: { orden: true } })

  const item = await prisma.mppEppCatalogo.create({
    data: {
      orden: (ultimo?.orden ?? 0) + 1,
      nombre,
      riesgo: String(body.riesgo ?? '').trim(),
      parteCuerpo: String(body.parteCuerpo ?? 'OTRO').trim(),
      durabilidad: body.durabilidad ? String(body.durabilidad).trim() : null,
      asignacionesDefault: Array.isArray(body.asignacionesDefault) ? body.asignacionesDefault : [],
      catalogoImagenId: body.catalogoImagenId ?? null,
      updatedAt: new Date(),
      puestosDefault: puestoIds ? { create: puestoIds.map(puestoId => ({ puestoId })) } : undefined,
    },
  })
  return Response.json({ item }, { status: 201 })
}
