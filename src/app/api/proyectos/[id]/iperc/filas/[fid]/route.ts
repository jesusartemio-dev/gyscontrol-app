import { rolesDe } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aplicarReglasFila } from '@/lib/iperc/riesgoResidual'
import { clasificarControles, leerOrigenControles, textoOrdenado, CAMPOS_CONTROL } from '@/lib/iperc/origenControles'
import { textosDelCatalogo } from '@/lib/iperc/origenControles.server'
import { ipercFilaSchema } from '@/lib/validators/iperc'

type Ctx = { params: Promise<{ id: string; fid: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

async function verificarAccesoFila(
  proyectoId: string,
  filaId: string,
  userId: string, roles: readonly string[]) {
  const proy = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      gestorId: true,
      supervisorId: true,
      liderId: true,
      comercialId: true,
      iperc: { select: { id: true } },
    },
  })
  if (!proy) return { ok: false as const, status: 404, error: 'Proyecto no encontrado' }
  if (!proy.iperc) return { ok: false as const, status: 404, error: 'IPERC no encontrado' }

  const esAsignado =
    proy.gestorId === userId ||
    proy.supervisorId === userId ||
    proy.liderId === userId ||
    proy.comercialId === userId

  if (!roles.some(r => ROLES_CON_ACCESO.includes(r)) && !esAsignado) {
    return { ok: false as const, status: 403, error: 'Sin acceso a este proyecto' }
  }

  const fila = await prisma.ipercFila.findFirst({
    where: { id: filaId, ipercId: proy.iperc.id },
  })
  if (!fila) return { ok: false as const, status: 404, error: 'Fila no encontrada' }

  return { ok: true as const, fila, ipercId: proy.iperc.id }
}

// GET /api/proyectos/[id]/iperc/filas/[fid]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId, fid } = await params
  const result = await verificarAccesoFila(proyectoId, fid, session.user.id, rolesDe(session))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ data: result.fila })
}

// PATCH /api/proyectos/[id]/iperc/filas/[fid]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId, fid } = await params
  const result = await verificarAccesoFila(proyectoId, fid, session.user.id, rolesDe(session))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await req.json()

  // La marca de revisada va sola: es de la app, no del contenido de la fila,
  // y marcarla no debe pasar por las reglas ni tocar la procedencia.
  if (typeof body.revisada === 'boolean' && Object.keys(body).length === 1) {
    const updated = await prisma.ipercFila.update({
      where: { id: fid },
      data: body.revisada
        ? { revisadaEn: new Date(), revisadaPorId: session.user.id }
        : { revisadaEn: null, revisadaPorId: null },
      include: { revisadaPor: { select: { name: true } } },
    })
    return NextResponse.json({ data: updated })
  }

  const parsed = ipercFilaSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  // La regla del SSOMA manda sobre el residual, tambien al editar a mano: con
  // los campos parciales hace falta la fila actual para conocer severidad,
  // probabilidad y el control que no se esta tocando.
  const actual = await prisma.ipercFila.findUnique({
    where: { id: fid },
    select: {
      severidad: true, probabilidad: true, origenControles: true,
      eliminar: true, sustituir: true,
      controlIngenieria: true, controlAdministrativo: true, controlReceptor: true,
    },
  })

  const data = aplicarReglasFila(parsed.data, actual)

  // Procedencia: lo que no cambio conserva la suya, lo nuevo es manual porque
  // esta ruta es la edicion desde la app.
  const tocaControles = CAMPOS_CONTROL.some(c => c in parsed.data)
  if (tocaControles) {
    const origen = clasificarControles(
      data,
      await textosDelCatalogo(),
      leerOrigenControles(actual?.origenControles),
      'manual',
    )
    for (const campo of CAMPOS_CONTROL) {
      if (campo in data) (data as Record<string, unknown>)[campo] = textoOrdenado(origen[campo] ?? [])
    }
    ;(data as Record<string, unknown>).origenControles = origen as object
  }

  // Si vino la marca junto con los cambios —el "guardar y siguiente" de la
  // revisión— manda esa. Si no, editar el contenido borra la marca: lo que se
  // reviso ya no es lo que dice la fila.
  if (typeof body.revisada === 'boolean') {
    Object.assign(data, body.revisada
      ? { revisadaEn: new Date(), revisadaPorId: session.user.id }
      : { revisadaEn: null, revisadaPorId: null })
  } else {
    Object.assign(data, { revisadaEn: null, revisadaPorId: null })
  }

  const updated = await prisma.ipercFila.update({
    where: { id: fid },
    data,
    include: { revisadaPor: { select: { name: true } } },
  })

  return NextResponse.json({ data: updated })
}

// DELETE /api/proyectos/[id]/iperc/filas/[fid]
// Elimina la fila y renumera las siguientes
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId, fid } = await params
  const result = await verificarAccesoFila(proyectoId, fid, session.user.id, rolesDe(session))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const { fila, ipercId } = result

  // Eliminar y renumerar en transacción
  await prisma.$transaction(async (tx) => {
    await tx.ipercFila.delete({ where: { id: fid } })

    // Decrementar en 1 las filas con numero > eliminada
    const filasPosteriores = await tx.ipercFila.findMany({
      where: { ipercId, numero: { gt: fila.numero } },
      orderBy: { numero: 'asc' },
    })

    for (const f of filasPosteriores) {
      await tx.ipercFila.update({
        where: { id: f.id },
        data: { numero: f.numero - 1 },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
