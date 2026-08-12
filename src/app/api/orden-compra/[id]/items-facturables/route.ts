import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

/**
 * GET /api/orden-compra/[id]/items-facturables
 *
 * Ítems de una OC con lo que Logística ya marcó como recibido y lo que
 * facturas anteriores ya cubrieron — es lo que Administración necesita ver
 * para armar una factura parcial (facturar solo los ítems entregados).
 *
 * `cantidadRecibida` la registra Logística en la recepción por ítem
 * (ver orden-compra/[id]/recepcion). `cantidadFacturada` sale de las líneas
 * CuentaPorPagarItem de facturas de ENTREGA (no anticipo) no anuladas.
 *
 * Anticipos: un anticipo se paga ANTES de que llegue el ítem, así que no
 * cuenta como "cantidad facturada" contra lo recibido — es dinero aparte.
 * Cuando llega la factura final del mismo ítem, esa factura (que NO es
 * anticipo) puede traer una línea en negativo que resta el anticipo ya
 * pagado — así lo hacía Administración en el sistema anterior (Odoo).
 * `anticipoPendienteDeAplicar` es lo que todavía no se restó en ninguna
 * factura final.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: ordenCompraId } = await params

    const oc = await prisma.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      select: {
        id: true,
        numero: true,
        moneda: true,
        subtotal: true,
        igv: true,
        total: true,
        estado: true,
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            unidad: true,
            cantidad: true,
            cantidadRecibida: true,
            precioUnitario: true,
            costoTotal: true,
            facturasItems: {
              where: { cuentaPorPagar: { estado: { not: 'anulada' } } },
              select: { cantidad: true, monto: true, cuentaPorPagar: { select: { esAdelanto: true } } },
            },
          },
        },
      },
    })

    if (!oc) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }

    let totalFacturado = 0

    // OrdenCompraItem.costoTotal está SIN IGV (su suma da oc.subtotal), pero
    // oc.total y las facturas del proveedor SÍ lo incluyen. Sin este factor,
    // el monto propuesto quedaría ~18% corto y lo facturado nunca cuadraría
    // contra el total de la OC.
    const factorIgv = oc.subtotal > 0 ? oc.total / oc.subtotal : 1

    const items = oc.items.map(item => {
      const lineasEntrega = item.facturasItems.filter(f => !f.cuentaPorPagar.esAdelanto)
      const lineasAnticipo = item.facturasItems.filter(f => f.cuentaPorPagar.esAdelanto)

      // Solo las líneas de ENTREGA tienen cantidad real — un anticipo no
      // corresponde a unidades recibidas, y su descuento (línea negativa
      // dentro de la factura final) tampoco.
      const cantidadFacturada = lineasEntrega.reduce((s, f) => s + (f.cantidad ?? 0), 0)
      const montoFacturado = item.facturasItems.reduce((s, f) => s + f.monto, 0)
      totalFacturado += montoFacturado

      const montoAnticipoRecibido = lineasAnticipo.reduce((s, f) => s + f.monto, 0)
      const montoAnticipoAplicado = lineasEntrega
        .filter(f => f.monto < 0)
        .reduce((s, f) => s + -f.monto, 0)
      const anticipoPendienteDeAplicar = Math.max(
        0,
        redondear(montoAnticipoRecibido - montoAnticipoAplicado)
      )

      // Lo facturable es lo recibido que todavía no se facturó. El precio
      // unitario ya viene neto de descuento vía costoTotal/cantidad.
      const precioNetoUnitario = item.cantidad > 0 ? item.costoTotal / item.cantidad : 0
      const cantidadPendiente = Math.max(0, redondear(item.cantidadRecibida - cantidadFacturada))

      return {
        id: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        cantidadRecibida: item.cantidadRecibida,
        cantidadFacturada: redondear(cantidadFacturada),
        cantidadPendiente,
        precioUnitario: item.precioUnitario,
        precioNetoUnitario: redondear(precioNetoUnitario),
        /** Precio unitario con IGV — es el que se usa para armar el monto de
         *  la factura, porque la del proveedor viene con impuesto incluido. */
        precioUnitarioConIgv: Math.round(precioNetoUnitario * factorIgv * 100) / 100,
        costoTotal: item.costoTotal,
        montoFacturado: redondear(montoFacturado),
        /** Ya se facturó todo lo que se recibió de este ítem. */
        totalmenteFacturado: cantidadPendiente <= 0,
        /** Anticipo ya pagado sobre este ítem, sin restar todavía en ninguna
         *  factura final. 0 si nunca hubo anticipo o ya se aplicó todo. */
        anticipoPendienteDeAplicar: redondear(anticipoPendienteDeAplicar),
      }
    })

    return NextResponse.json({
      ordenCompra: {
        id: oc.id,
        numero: oc.numero,
        moneda: oc.moneda,
        total: oc.total,
        estado: oc.estado,
      },
      items,
      resumen: {
        totalOc: oc.total,
        subtotalOc: oc.subtotal,
        igvOc: oc.igv,
        factorIgv: Math.round(factorIgv * 10000) / 10000,
        totalFacturado: redondear(totalFacturado),
        saldoPorFacturar: redondear(oc.total - totalFacturado),
      },
    })
  } catch (error) {
    console.error('Error al obtener items facturables de la OC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}
