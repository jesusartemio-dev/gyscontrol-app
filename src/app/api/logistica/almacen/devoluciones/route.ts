import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const proyectoId = searchParams.get('proyectoId')
  const estado = searchParams.get('estado')

  const where: any = {}
  if (proyectoId) where.proyectoId = proyectoId
  if (estado) where.estado = estado

  const devoluciones = await prisma.devolucionMaterial.findMany({
    where,
    include: {
      proyecto: { select: { id: true, nombre: true, codigo: true } },
      registradoPor: { select: { name: true, email: true } },
      devueltoPor: { select: { name: true, email: true } },
      items: {
        include: {
          catalogoEquipo: { select: { codigo: true, descripcion: true } },
        },
      },
    },
    orderBy: { fechaDevolucion: 'desc' },
  })

  return NextResponse.json(devoluciones)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = session.user.role
  if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { proyectoId, devueltoPorId, observaciones, items } = body

    if (!proyectoId || !items?.length) {
      return NextResponse.json({ error: 'proyectoId e items son requeridos' }, { status: 400 })
    }

    const almacen = await getAlmacenCentral()

    const devolucion = await prisma.$transaction(async (tx) => {
      const dev = await tx.devolucionMaterial.create({
        data: {
          proyectoId,
          registradoPorId: session.user.id,
          devueltoPorId: devueltoPorId || null,
          observaciones: observaciones || null,
          items: {
            create: items.map((item: any) => ({
              catalogoEquipoId: item.catalogoEquipoId,
              cantidad: item.cantidad,
              pedidoEquipoItemId: item.pedidoEquipoItemId || null,
              observacionesItem: item.observacionesItem || null,
              estadoItem: item.estadoItem || 'bueno',
            })),
          },
        },
        include: { items: true },
      })

      // Registrar movimientos de stock por cada item
      for (const item of dev.items) {
        await registrarMovimiento({
          almacenId: almacen.id,
          tipo: 'devolucion_proyecto',
          catalogoEquipoId: item.catalogoEquipoId,
          cantidad: item.cantidad,
          usuarioId: session.user.id,
          devolucionMaterialId: dev.id,
          observaciones: `Devolución desde proyecto ${proyectoId}`,
        }, tx as any)
      }

      return dev
    })

    return NextResponse.json(devolucion, { status: 201 })
  } catch (error) {
    console.error('Error al registrar devolución:', error)
    return NextResponse.json({ error: 'Error al registrar devolución' }, { status: 500 })
  }
}
