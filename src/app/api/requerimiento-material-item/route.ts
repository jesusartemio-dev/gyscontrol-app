import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/requerimiento-material-item
 * Agrega un item de pedido a un requerimiento de materiales en estado borrador.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const {
      hojaDeGastosId,
      pedidoEquipoItemId,
      cantidadSolicitada,
      precioEstimado,
    } = body

    if (!hojaDeGastosId || !pedidoEquipoItemId || !cantidadSolicitada) {
      return NextResponse.json(
        { error: 'hojaDeGastosId, pedidoEquipoItemId y cantidadSolicitada son requeridos' },
        { status: 400 }
      )
    }

    // Validar que la hoja es de tipo materiales y está en borrador
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id: hojaDeGastosId },
      select: { id: true, estado: true, tipoPropósito: true },
    })

    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.tipoPropósito !== 'compra_materiales') {
      return NextResponse.json({ error: 'Solo se pueden agregar items a requerimientos de materiales' }, { status: 400 })
    }
    if (hoja.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se pueden agregar items cuando el requerimiento está en borrador' }, { status: 409 })
    }

    // Verificar que el item no está ya en esta hoja
    const existente = await prisma.requerimientoMaterialItem.findFirst({
      where: { hojaDeGastosId, pedidoEquipoItemId },
    })
    if (existente) {
      return NextResponse.json({ error: 'Este item ya está incluido en el requerimiento' }, { status: 409 })
    }

    // Obtener datos del pedido item
    const pedidoItem = await prisma.pedidoEquipoItem.findUnique({
      where: { id: pedidoEquipoItemId },
      select: {
        id: true,
        pedidoId: true,
        codigo: true,
        descripcion: true,
        unidad: true,
        precioUnitario: true,
        pedidoEquipo: { select: { proyectoId: true } },
      },
    })

    if (!pedidoItem) {
      return NextResponse.json({ error: 'Item de pedido no encontrado' }, { status: 404 })
    }

    const precio = precioEstimado ?? pedidoItem.precioUnitario ?? null
    const totalEstimado = precio !== null ? cantidadSolicitada * precio : null

    const item = await prisma.requerimientoMaterialItem.create({
      data: {
        hojaDeGastosId,
        pedidoEquipoItemId,
        pedidoId: pedidoItem.pedidoId,
        proyectoId: pedidoItem.pedidoEquipo.proyectoId,
        codigo: pedidoItem.codigo,
        descripcion: pedidoItem.descripcion,
        unidad: pedidoItem.unidad,
        cantidadSolicitada,
        precioEstimado: precio,
        totalEstimado,
        updatedAt: new Date(),
      },
      include: {
        pedidoEquipoItem: { select: { id: true, codigo: true, descripcion: true } },
        proyecto: { select: { id: true, codigo: true, nombre: true } },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error al agregar item de requerimiento:', error)
    return NextResponse.json(
      { error: 'Error al agregar item: ' + String(error) },
      { status: 500 }
    )
  }
}
