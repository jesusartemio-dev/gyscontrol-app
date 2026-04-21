import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * PUT reemplaza completamente la lista de items del borrador.
 * Solo válido si la solicitud está en estado 'borrador' y pertenece al usuario.
 *
 * Body: { items: [{ catalogoHerramientaId, cantidad }], proyectoId?, observaciones? }
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { items, proyectoId, observaciones, fechaRequerida, fechaDevolucionEstimada } = body

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items debe ser un array' }, { status: 400 })
  }
  for (const it of items) {
    if (!it?.catalogoHerramientaId) {
      return NextResponse.json({ error: 'Cada ítem requiere catalogoHerramientaId' }, { status: 400 })
    }
    if (!Number.isFinite(it.cantidad) || it.cantidad <= 0) {
      return NextResponse.json({ error: 'Cada ítem requiere cantidad > 0' }, { status: 400 })
    }
  }

  const fReq = fechaRequerida ? new Date(fechaRequerida) : null
  const fDev = fechaDevolucionEstimada ? new Date(fechaDevolucionEstimada) : null
  if (fReq && isNaN(fReq.getTime())) {
    return NextResponse.json({ error: 'fechaRequerida inválida' }, { status: 400 })
  }
  if (fDev && isNaN(fDev.getTime())) {
    return NextResponse.json({ error: 'fechaDevolucionEstimada inválida' }, { status: 400 })
  }
  if (fReq && fDev && fDev < fReq) {
    return NextResponse.json(
      { error: 'La fecha de devolución no puede ser anterior a la fecha requerida' },
      { status: 400 }
    )
  }

  const solicitud = await prisma.solicitudHerramienta.findUnique({
    where: { id },
    select: { id: true, estado: true, solicitanteId: true },
  })
  if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (solicitud.solicitanteId !== session.user.id) {
    return NextResponse.json({ error: 'Solo el solicitante puede editar' }, { status: 403 })
  }
  if (solicitud.estado !== 'borrador') {
    return NextResponse.json(
      { error: `No se puede editar una solicitud en estado "${solicitud.estado}"` },
      { status: 400 }
    )
  }

  // Reemplazo total: borra todos los items y crea los nuevos, actualiza cabecera.
  const actualizada = await prisma.$transaction(async (tx) => {
    await tx.solicitudHerramientaItem.deleteMany({ where: { solicitudId: id } })
    return tx.solicitudHerramienta.update({
      where: { id },
      data: {
        proyectoId: proyectoId ?? null,
        observaciones: observaciones ?? null,
        fechaRequerida: fReq,
        fechaDevolucionEstimada: fDev,
        items: {
          create: items.map((it: any) => ({
            catalogoHerramientaId: it.catalogoHerramientaId,
            cantidad: it.cantidad,
          })),
        },
      },
      include: {
        items: {
          include: {
            catalogoHerramienta: {
              select: {
                id: true, codigo: true, nombre: true, unidadMedida: true,
                stock: { select: { cantidadDisponible: true } },
              },
            },
          },
        },
      },
    })
  })

  return NextResponse.json(actualizada)
}
