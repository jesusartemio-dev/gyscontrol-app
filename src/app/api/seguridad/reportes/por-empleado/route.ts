import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/seguridad/reportes/por-empleado?desde&hasta&empleadoId
 * Reporte de auditoría laboral: lista de entregas por empleado.
 *  - Si no se especifica empleadoId, devuelve resumen de todos
 *  - Si se especifica, devuelve detalle completo del empleado seleccionado
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const desdeParam = searchParams.get('desde')
    const hastaParam = searchParams.get('hasta')
    const empleadoId = searchParams.get('empleadoId')

    const hasta = hastaParam ? new Date(hastaParam) : new Date()
    const desde = desdeParam
      ? new Date(desdeParam)
      : new Date(hasta.getFullYear() - 1, hasta.getMonth(), hasta.getDate())

    // Modo detalle: un empleado puntual
    if (empleadoId) {
      const empleado = await prisma.empleado.findUnique({
        where: { id: empleadoId },
        select: {
          id: true,
          documentoIdentidad: true,
          tallaCamisa: true,
          tallaPantalon: true,
          tallaCalzado: true,
          tallaCasco: true,
          cargo: { select: { nombre: true } },
          departamento: { select: { nombre: true } },
          user: { select: { name: true, email: true } },
        },
      })
      if (!empleado) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })

      const items = await prisma.entregaEPPItem.findMany({
        where: {
          fechaEntrega: { gte: desde, lte: hasta },
          entrega: { empleadoId },
        },
        include: {
          catalogoEpp: {
            select: {
              codigo: true, descripcion: true, marca: true, subcategoria: true,
              unidad: { select: { nombre: true } },
            },
          },
          entrega: {
            select: {
              numero: true,
              fechaEntrega: true,
              proyecto: { select: { codigo: true } },
              centroCosto: { select: { nombre: true } },
              entregadoPor: { select: { name: true } },
            },
          },
        },
        orderBy: { fechaEntrega: 'desc' },
      })

      const totalCantidad = items.reduce((s, i) => s + i.cantidad, 0)
      const totalCostoPEN = items
        .filter(i => i.costoMoneda !== 'USD')
        .reduce((s, i) => s + (i.costoUnitario ?? 0) * i.cantidad, 0)
      const totalCostoUSD = items
        .filter(i => i.costoMoneda === 'USD')
        .reduce((s, i) => s + (i.costoUnitario ?? 0) * i.cantidad, 0)

      return NextResponse.json({
        modo: 'detalle',
        empleado,
        desde, hasta,
        totales: { items: items.length, cantidad: totalCantidad, costoPEN: totalCostoPEN, costoUSD: totalCostoUSD },
        items,
      })
    }

    // Modo resumen: todos los empleados
    const items = await prisma.entregaEPPItem.findMany({
      where: { fechaEntrega: { gte: desde, lte: hasta } },
      select: {
        cantidad: true,
        costoUnitario: true,
        costoMoneda: true,
        entrega: {
          select: {
            empleado: {
              select: {
                id: true,
                documentoIdentidad: true,
                cargo: { select: { nombre: true } },
                departamento: { select: { nombre: true } },
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    type Resumen = {
      empleadoId: string
      nombre: string
      documentoIdentidad: string | null
      cargo: string | null
      departamento: string | null
      cantidadItems: number
      cantidadTotal: number
      costoPEN: number
      costoUSD: number
    }
    const map = new Map<string, Resumen>()
    for (const it of items) {
      const e = it.entrega.empleado
      let r = map.get(e.id)
      if (!r) {
        r = {
          empleadoId: e.id,
          nombre: e.user.name ?? '(sin nombre)',
          documentoIdentidad: e.documentoIdentidad,
          cargo: e.cargo?.nombre ?? null,
          departamento: e.departamento?.nombre ?? null,
          cantidadItems: 0,
          cantidadTotal: 0,
          costoPEN: 0,
          costoUSD: 0,
        }
        map.set(e.id, r)
      }
      const bucket: Resumen = r
      bucket.cantidadItems += 1
      bucket.cantidadTotal += it.cantidad
      const costo = (it.costoUnitario ?? 0) * it.cantidad
      if (it.costoMoneda === 'USD') bucket.costoUSD += costo
      else bucket.costoPEN += costo
    }

    const empleados = Array.from(map.values()).sort((a, b) => b.cantidadTotal - a.cantidadTotal)

    return NextResponse.json({ modo: 'resumen', desde, hasta, empleados })
  } catch (error: any) {
    console.error('Error en reporte por empleado:', error)
    return NextResponse.json({ error: error?.message || 'Error en reporte' }, { status: 500 })
  }
}
