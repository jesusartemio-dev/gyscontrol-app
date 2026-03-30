import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    const role = session.user.role
    const esLogistica = ['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)

    const solicitudes = await prisma.solicitudRecurso.findMany({
      where: {
        ...(proyectoId ? { proyectoId } : {}),
        ...(estado ? { estado } : {}),
        // No logística: solo ve las propias o de sus proyectos
        ...(!esLogistica && !proyectoId ? { solicitanteId: session.user.id } : {}),
      },
      include: {
        proyecto: { select: { id: true, nombre: true, codigo: true } },
        solicitante: { select: { id: true, name: true } },
        aprobador: { select: { id: true, name: true } },
        items: {
          include: { catalogoRecurso: { select: { id: true, nombre: true, categoria: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(solicitudes)
  } catch (error) {
    console.error('Error al obtener solicitudes recurso:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { proyectoId, titulo, fechaNecesaria, observaciones, items } = body

    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId es requerido' }, { status: 400 })
    }

    const solicitud = await prisma.solicitudRecurso.create({
      data: {
        proyectoId,
        solicitanteId: session.user.id,
        titulo: titulo || null,
        fechaNecesaria: fechaNecesaria ? new Date(fechaNecesaria) : null,
        observaciones: observaciones || null,
        estado: 'borrador',
        items: items?.length
          ? {
              create: items.map((item: any) => ({
                catalogoRecursoId: item.catalogoRecursoId || null,
                descripcion: item.descripcion,
                unidad: item.unidad,
                cantidad: item.cantidad,
                precioEstimado: item.precioEstimado ?? null,
                totalEstimado: item.precioEstimado && item.cantidad
                  ? item.precioEstimado * item.cantidad
                  : null,
                fechaInicio: item.fechaInicio ? new Date(item.fechaInicio) : null,
                fechaFin: item.fechaFin ? new Date(item.fechaFin) : null,
                edtId: item.edtId || null,
                observaciones: item.observaciones || null,
              })),
            }
          : undefined,
      },
      include: {
        proyecto: { select: { id: true, nombre: true, codigo: true } },
        solicitante: { select: { id: true, name: true } },
        items: {
          include: { catalogoRecurso: { select: { id: true, nombre: true, categoria: true } } },
        },
      },
    })

    return NextResponse.json(solicitud, { status: 201 })
  } catch (error) {
    console.error('Error al crear solicitud recurso:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
