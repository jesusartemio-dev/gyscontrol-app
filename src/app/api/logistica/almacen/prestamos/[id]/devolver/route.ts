import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = session.user.role
  if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    // items: [{ prestamoItemId, cantidadDevuelta, observacionDevolucion? }]
    const { items } = body

    if (!items?.length) return NextResponse.json({ error: 'items requeridos' }, { status: 400 })

    const almacen = await getAlmacenCentral()

    const prestamo = await prisma.prestamoHerramienta.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!prestamo) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
    if (prestamo.estado === 'devuelto') return NextResponse.json({ error: 'El préstamo ya está devuelto' }, { status: 409 })

    // Validar cantidades antes de tocar nada
    for (const devItem of items) {
      const prestamoItem = prestamo.items.find(i => i.id === devItem.prestamoItemId)
      if (!prestamoItem) {
        return NextResponse.json({ error: `Ítem ${devItem.prestamoItemId} no pertenece al préstamo` }, { status: 400 })
      }
      const pendiente = prestamoItem.cantidadPrestada - prestamoItem.cantidadDevuelta
      const cantDev = Number(devItem.cantidadDevuelta) || 0
      if (cantDev <= 0) {
        return NextResponse.json({ error: `Cantidad inválida para "${prestamoItem.id}"` }, { status: 400 })
      }
      if (cantDev > pendiente) {
        return NextResponse.json({ error: `No se puede devolver ${cantDev}, solo quedan ${pendiente} pendientes` }, { status: 400 })
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const devItem of items) {
        const prestamoItem = prestamo.items.find(i => i.id === devItem.prestamoItemId)
        if (!prestamoItem) continue

        const cantDev = Number(devItem.cantidadDevuelta) || prestamoItem.cantidadPrestada
        const obsNueva = (devItem.observacionDevolucion || '').trim()
        const obsPrev = (prestamoItem.observacionDevolucion || '').trim()
        const fechaStr = new Date().toLocaleDateString('es-PE')
        const obsCombinada = obsNueva
          ? (obsPrev ? `${obsPrev}\n[${fechaStr}] ${obsNueva}` : `[${fechaStr}] ${obsNueva}`)
          : (obsPrev || null)

        await tx.prestamoHerramientaItem.update({
          where: { id: devItem.prestamoItemId },
          data: {
            cantidadDevuelta: prestamoItem.cantidadDevuelta + cantDev,
            fechaDevolucionItem: new Date(),
            estado: (prestamoItem.cantidadDevuelta + cantDev) >= prestamoItem.cantidadPrestada ? 'devuelto' : 'prestado',
            observacionDevolucion: obsCombinada,
          },
        })

        if (prestamoItem.herramientaUnidadId) {
          await tx.herramientaUnidad.update({
            where: { id: prestamoItem.herramientaUnidadId },
            data: { estado: 'disponible' },
          })
          await registrarMovimiento({
            almacenId: almacen.id,
            tipo: 'devolucion_herramienta',
            herramientaUnidadId: prestamoItem.herramientaUnidadId,
            cantidad: 1,
            usuarioId: session.user.id,
            prestamoHerramientaId: id,
            observaciones: obsNueva || undefined,
          }, tx as any)
        } else if (prestamoItem.catalogoHerramientaId) {
          await registrarMovimiento({
            almacenId: almacen.id,
            tipo: 'devolucion_herramienta',
            catalogoHerramientaId: prestamoItem.catalogoHerramientaId,
            cantidad: cantDev,
            usuarioId: session.user.id,
            prestamoHerramientaId: id,
            observaciones: obsNueva || undefined,
          }, tx as any)
        }
      }

      // Recalcular estado del préstamo
      const itemsActualizados = await tx.prestamoHerramientaItem.findMany({ where: { prestamoId: id } })
      const todoDevuelto = itemsActualizados.every(i => i.estado === 'devuelto' || i.estado === 'perdido')
      const algunoDevuelto = itemsActualizados.some(i => i.cantidadDevuelta > 0)

      await tx.prestamoHerramienta.update({
        where: { id },
        data: {
          estado: todoDevuelto ? 'devuelto' : algunoDevuelto ? 'devuelto_parcial' : 'activo',
          fechaDevolucionReal: todoDevuelto ? new Date() : null,
          recibidoPorId: session.user.id,
        },
      })
    })

    const prestamoActualizado = await prisma.prestamoHerramienta.findUnique({
      where: { id },
      include: { items: { include: { herramientaUnidad: true, catalogoHerramienta: true } } },
    })

    return NextResponse.json(prestamoActualizado)
  } catch (error: any) {
    console.error('Error al devolver:', error)
    return NextResponse.json({ error: error.message || 'Error al registrar devolución' }, { status: 500 })
  }
}
