import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const includeRelations = {
  proveedor: { select: { id: true, nombre: true, ruc: true } },
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  ordenCompra: {
    select: {
      id: true,
      numero: true,
      total: true,
      centroCosto: { select: { id: true, nombre: true } },
    },
  },
  pedidoEquipo: { select: { id: true, codigo: true } },
  pedidoEquipoItem: { select: { id: true, codigo: true, descripcion: true } },
  itemsFacturados: {
    select: {
      id: true,
      cantidad: true,
      monto: true,
      ordenCompraItem: { select: { id: true, codigo: true, descripcion: true, unidad: true } },
    },
  },
  pagos: {
    include: { cuentaBancaria: { select: { id: true, nombreBanco: true, numeroCuenta: true } } },
    orderBy: { fechaPago: 'desc' as const },
  },
  adjuntos: {
    include: { subidoPor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const proveedorId = searchParams.get('proveedorId')
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    const where: any = {}
    if (proveedorId) where.proveedorId = proveedorId
    if (proyectoId) where.proyectoId = proyectoId
    if (estado) where.estado = estado

    const cuentas = await prisma.cuentaPorPagar.findMany({
      where,
      include: includeRelations,
      orderBy: { fechaRecepcion: 'desc' },
    })

    return NextResponse.json(cuentas)
  } catch (error) {
    console.error('Error al listar CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const {
      proveedorId, proyectoId, ordenCompraId, pedidoEquipoId, pedidoEquipoItemId,
      tipoOrigen, tipoDocumento, numeroFactura, descripcion, monto, moneda, tipoCambio,
      fechaRecepcion, fechaVencimiento, condicionPago, formaPago, diasCredito,
      detraccionPorcentaje, guardarDetraccionDefault, observaciones,
      numeroCheque, numeroLetra, items,
    } = body

    if (!proveedorId || !monto || !fechaRecepcion || !fechaVencimiento) {
      return NextResponse.json({ error: 'proveedorId, monto, fechaRecepcion y fechaVencimiento son requeridos' }, { status: 400 })
    }

    const detraccion = detraccionPorcentaje != null && detraccionPorcentaje !== ''
      ? Number(detraccionPorcentaje)
      : null

    // Detalle de qué ítems de la OC cubre esta factura (facturación parcial).
    // Opcional: las facturas que no vienen de una OC no lo envían.
    type ItemFacturado = { ordenCompraItemId: string; cantidad: number; monto: number }
    const itemsFacturados: ItemFacturado[] = Array.isArray(items)
      ? items
          .filter((it: any) => it?.ordenCompraItemId && Number(it.cantidad) > 0)
          .map((it: any) => ({
            ordenCompraItemId: String(it.ordenCompraItemId),
            cantidad: Number(it.cantidad),
            monto: Number(it.monto) || 0,
          }))
      : []

    if (itemsFacturados.length > 0) {
      if (!ordenCompraId) {
        return NextResponse.json(
          { error: 'No se pueden registrar ítems sin una orden de compra vinculada' },
          { status: 400 }
        )
      }
      // Los ítems tienen que pertenecer a la OC vinculada — evita que un id
      // de otra OC se cuele y desvirtúe el control de "cuánto falta facturar".
      const validos = await prisma.ordenCompraItem.count({
        where: { ordenCompraId, id: { in: itemsFacturados.map(i => i.ordenCompraItemId) } },
      })
      if (validos !== itemsFacturados.length) {
        return NextResponse.json(
          { error: 'Algunos ítems no pertenecen a la orden de compra seleccionada' },
          { status: 400 }
        )
      }
    }

    const cuenta = await prisma.cuentaPorPagar.create({
      data: {
        proveedorId,
        proyectoId: proyectoId || null,
        ordenCompraId: ordenCompraId || null,
        pedidoEquipoId: pedidoEquipoId || null,
        pedidoEquipoItemId: pedidoEquipoItemId || null,
        tipoOrigen: tipoOrigen || null,
        tipoDocumento: tipoDocumento || 'factura',
        numeroFactura: numeroFactura || null,
        descripcion: descripcion || null,
        monto,
        moneda: moneda || 'PEN',
        tipoCambio: tipoCambio || null,
        saldoPendiente: monto,
        fechaRecepcion: new Date(fechaRecepcion),
        fechaVencimiento: new Date(fechaVencimiento),
        condicionPago: condicionPago || 'contado',
        formaPago: formaPago || null,
        diasCredito: diasCredito ? Number(diasCredito) : null,
        detraccionPorcentaje: detraccion,
        observaciones: observaciones || null,
        numeroCheque: numeroCheque || null,
        numeroLetra: numeroLetra || null,
        updatedAt: new Date(),
        ...(itemsFacturados.length > 0 && {
          itemsFacturados: { create: itemsFacturados },
        }),
      },
      include: includeRelations,
    })

    // Auto-aprender el % por proveedor: si pidieron guardar como default
    // y hay un valor numérico, lo persistimos en proveedor.detraccionPorcentajeDefault.
    if (guardarDetraccionDefault && detraccion != null && !isNaN(detraccion)) {
      await prisma.proveedor.update({
        where: { id: proveedorId },
        data: { detraccionPorcentajeDefault: detraccion },
      })
    }

    return NextResponse.json(cuenta, { status: 201 })
  } catch (error) {
    console.error('Error al crear CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
