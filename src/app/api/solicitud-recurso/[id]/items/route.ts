import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const solicitud = await prisma.solicitudRecurso.findUnique({ where: { id } })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se pueden agregar ítems en estado borrador' }, { status: 409 })
    }

    const body = await req.json()
    const { catalogoRecursoId, descripcion, unidad, cantidad, precioEstimado, fechaInicio, fechaFin, edtId, observaciones } = body

    if (!descripcion || !unidad || !cantidad) {
      return NextResponse.json({ error: 'descripcion, unidad y cantidad son requeridos' }, { status: 400 })
    }

    const item = await prisma.solicitudRecursoItem.create({
      data: {
        solicitudId: id,
        catalogoRecursoId: catalogoRecursoId || null,
        descripcion,
        unidad,
        cantidad,
        precioEstimado: precioEstimado ?? null,
        totalEstimado: precioEstimado && cantidad ? precioEstimado * cantidad : null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        edtId: edtId || null,
        observaciones: observaciones || null,
      },
      include: {
        catalogoRecurso: { select: { id: true, nombre: true, categoria: true } },
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error al agregar ítem:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
