import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/gasto-comprobante
 *
 * Crea un comprobante compartido (factura dividida) para un requerimiento de materiales.
 * Un comprobante puede cubrir items de múltiples proyectos.
 * Al crear el comprobante se crean también las GastoLinea asociadas, una por item/proyecto.
 *
 * Body:
 * {
 *   hojaDeGastosId: string
 *   tipoComprobante: "factura" | "boleta" | "recibo" | "ticket"
 *   numeroComprobante: string
 *   proveedorNombre?: string
 *   proveedorRuc?: string
 *   montoTotal: number
 *   fecha: string (ISO date)
 *   observaciones?: string
 *   lineas: Array<{
 *     descripcion: string
 *     monto: number
 *     proyectoId?: string       // override de imputación
 *     centroCostoId?: string    // override de imputación
 *     categoriaGastoId?: string
 *     observaciones?: string
 *     requerimientoMaterialItemId?: string  // para actualizar precioReal en el item
 *   }>
 * }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      hojaDeGastosId,
      tipoComprobante,
      numeroComprobante,
      proveedorNombre,
      proveedorRuc,
      montoTotal,
      fecha,
      observaciones,
      lineas = [],
    } = body

    if (!hojaDeGastosId || !tipoComprobante || !numeroComprobante || !montoTotal || !fecha) {
      return NextResponse.json(
        { error: 'hojaDeGastosId, tipoComprobante, numeroComprobante, montoTotal y fecha son requeridos' },
        { status: 400 }
      )
    }
    if (lineas.length === 0) {
      return NextResponse.json({ error: 'El comprobante debe tener al menos una línea' }, { status: 400 })
    }

    // Validar hoja
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id: hojaDeGastosId },
      select: { id: true, estado: true },
    })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    // Comprobantes se pueden subir en estado depositado o aprobado (durante la rendición)
    if (!['aprobado', 'depositado'].includes(hoja.estado)) {
      return NextResponse.json(
        { error: `No se pueden agregar comprobantes en estado "${hoja.estado}". Debe estar en aprobado o depositado.` },
        { status: 409 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el comprobante compartido
      const comprobante = await tx.gastoComprobante.create({
        data: {
          hojaDeGastosId,
          tipoComprobante,
          numeroComprobante,
          proveedorNombre: proveedorNombre || null,
          proveedorRuc: proveedorRuc || null,
          montoTotal,
          fecha: new Date(fecha + 'T12:00:00.000Z'),
          observaciones: observaciones || null,
          updatedAt: new Date(),
        },
      })

      // 2. Crear las GastoLinea vinculadas al comprobante
      const lineasCreadas = []
      for (const linea of lineas) {
        const gastoLinea = await tx.gastoLinea.create({
          data: {
            hojaDeGastosId,
            gastoComprobanteId: comprobante.id,
            descripcion: linea.descripcion,
            fecha: new Date(fecha + 'T12:00:00.000Z'),
            monto: linea.monto,
            moneda: linea.moneda || 'PEN',
            tipoComprobante,
            numeroComprobante,
            proveedorNombre: proveedorNombre || null,
            proveedorRuc: proveedorRuc || null,
            proyectoId: linea.proyectoId || null,
            centroCostoId: linea.centroCostoId || null,
            categoriaGastoId: linea.categoriaGastoId || null,
            categoriaCosto: linea.categoriaCosto || null,
            observaciones: linea.observaciones || null,
            updatedAt: new Date(),
          },
        })
        lineasCreadas.push(gastoLinea)

        // 3. Si la línea está vinculada a un item de requerimiento, actualizar precioReal
        if (linea.requerimientoMaterialItemId && linea.cantidad) {
          const precioReal = linea.monto / linea.cantidad
          await tx.requerimientoMaterialItem.update({
            where: { id: linea.requerimientoMaterialItemId },
            data: {
              precioReal,
              totalReal: linea.monto,
              updatedAt: new Date(),
            },
          })
        }
      }

      return { comprobante, lineas: lineasCreadas }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al crear comprobante:', error)
    return NextResponse.json(
      { error: 'Error al crear comprobante: ' + String(error) },
      { status: 500 }
    )
  }
}
