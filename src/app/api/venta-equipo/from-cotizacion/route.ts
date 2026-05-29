import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { cotizacionId, nombre, fechaEntregaEstimada, observacion } = body

    if (!cotizacionId) {
      return NextResponse.json({ error: 'cotizacionId es requerido' }, { status: 400 })
    }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: true,
        cotizacionEquipo: {
          orderBy: { orden: 'asc' },
          include: {
            cotizacionEquipoItem: { orderBy: { orden: 'asc' } },
          },
        },
      },
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }
    if (cotizacion.estado !== 'aprobada') {
      return NextResponse.json({ error: 'La cotización debe estar aprobada' }, { status: 400 })
    }
    if (!cotizacion.clienteId || !cotizacion.cliente) {
      return NextResponse.json({ error: 'La cotización debe tener un cliente asignado' }, { status: 400 })
    }
    if (cotizacion.totalEquiposCliente <= 0) {
      return NextResponse.json({ error: 'La cotización no tiene equipos' }, { status: 400 })
    }

    const cliente = cotizacion.cliente
    const comercialId = cotizacion.comercialId || session.user.id
    const nuevoNumero = (cliente.ventaEquipoNumeroSecuencia ?? 0) + 1
    const codigo = `${cliente.codigo}-EQU-${String(nuevoNumero).padStart(2, '0')}`

    const allItems = cotizacion.cotizacionEquipo.flatMap(grupo =>
      grupo.cotizacionEquipoItem.map(item => ({
        id: randomUUID(),
        catalogoEquipoId: item.catalogoEquipoId ?? null,
        codigo: item.codigo,
        descripcion: item.descripcion,
        categoria: item.categoria,
        unidad: item.unidad,
        marca: item.marca,
        cantidad: item.cantidad,
        precioUnitarioCliente: item.precioCliente,
        costoCliente: item.costoCliente,
        costoInterno: item.costoInterno,
        updatedAt: new Date(),
      }))
    )

    const ventaId = randomUUID()

    await prisma.$transaction(async (tx) => {
      await tx.cliente.update({
        where: { id: cliente.id },
        data: { ventaEquipoNumeroSecuencia: nuevoNumero },
      })

      await tx.ventaEquipo.create({
        data: {
          id: ventaId,
          codigo,
          numeroSecuencia: nuevoNumero,
          nombre: nombre || cotizacion.nombre,
          clienteId: cliente.id,
          comercialId,
          cotizacionId,
          moneda: cotizacion.moneda || 'USD',
          tipoCambio: cotizacion.tipoCambio ?? 1,
          totalInterno: cotizacion.totalEquiposInterno,
          totalCliente: cotizacion.totalEquiposCliente,
          descuento: cotizacion.descuento,
          grandTotal: cotizacion.grandTotal,
          fechaEntregaEstimada: fechaEntregaEstimada ? new Date(fechaEntregaEstimada) : null,
          observacion: observacion ?? null,
          items: {
            create: allItems.map(item => ({ ...item, ventaEquipoId: undefined })),
          },
        },
      })
    })

    const result = await prisma.ventaEquipo.findUnique({
      where: { id: ventaId },
      include: {
        cliente: { select: { id: true, nombre: true, codigo: true } },
        comercial: { select: { id: true, name: true } },
        cotizacion: { select: { id: true, codigo: true, nombre: true } },
        items: { orderBy: { createdAt: 'asc' } },
        pedidos: { select: { id: true, codigo: true, estado: true } },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[POST /api/venta-equipo/from-cotizacion]', error)
    return NextResponse.json({ error: 'Error al crear venta de equipos' }, { status: 500 })
  }
}
