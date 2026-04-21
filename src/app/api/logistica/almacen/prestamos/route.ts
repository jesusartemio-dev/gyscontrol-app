import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'
import { crearNotificacion } from '@/lib/utils/notificaciones'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const usuarioId = searchParams.get('usuarioId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const where: any = {}
  if (estado) where.estado = estado
  if (usuarioId) where.usuarioId = usuarioId

  const prestamos = await prisma.prestamoHerramienta.findMany({
    where,
    include: {
      usuario: { select: { id: true, name: true, email: true } },
      entregadoPor: { select: { name: true } },
      recibidoPor: { select: { name: true } },
      proyecto: { select: { id: true, nombre: true, codigo: true } },
      items: {
        include: {
          herramientaUnidad: { include: { catalogoHerramienta: { select: { nombre: true, codigo: true } } } },
          catalogoHerramienta: { select: { nombre: true, codigo: true } },
        },
      },
    },
    orderBy: { fechaPrestamo: 'desc' },
    take: limit,
  })

  return NextResponse.json({ prestamos })
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
    const { usuarioId, proyectoId, observaciones, items, solicitudHerramientaId } = body
    let { fechaDevolucionEstimada } = body

    if (!usuarioId || !items?.length) {
      return NextResponse.json({ error: 'usuarioId e items son requeridos' }, { status: 400 })
    }

    // Si viene de una solicitud, validar que esté activa (enviado o atendida_parcial — no cerrada).
    if (solicitudHerramientaId) {
      const sol = await prisma.solicitudHerramienta.findUnique({
        where: { id: solicitudHerramientaId },
        select: { id: true, estado: true, fechaDevolucionEstimada: true },
      })
      if (!sol) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
      if (sol.estado !== 'enviado' && sol.estado !== 'atendida_parcial') {
        return NextResponse.json(
          { error: `La solicitud no está activa (estado: ${sol.estado})` },
          { status: 400 }
        )
      }
      // Heredar fecha de devolución de la solicitud si el body no la trae explícita.
      if (!fechaDevolucionEstimada && sol.fechaDevolucionEstimada) {
        fechaDevolucionEstimada = sol.fechaDevolucionEstimada.toISOString()
      }
    }

    const almacen = await getAlmacenCentral()

    const prestamo = await prisma.$transaction(async (tx) => {
      // Validar disponibilidad
      for (const item of items) {
        if (item.herramientaUnidadId) {
          const unidad = await tx.herramientaUnidad.findUnique({ where: { id: item.herramientaUnidadId } })
          if (unidad?.estado !== 'disponible') {
            throw new Error(`La unidad ${unidad?.serie} no está disponible (estado: ${unidad?.estado})`)
          }
        } else if (item.catalogoHerramientaId) {
          const stock = await tx.stockAlmacen.findUnique({
            where: { almacenId_catalogoHerramientaId: { almacenId: almacen.id, catalogoHerramientaId: item.catalogoHerramientaId } },
          })
          if (!stock || stock.cantidadDisponible < item.cantidadPrestada) {
            throw new Error(`Stock insuficiente para herramienta`)
          }
        }
      }

      const prest = await tx.prestamoHerramienta.create({
        data: {
          usuarioId,
          proyectoId: proyectoId || null,
          fechaDevolucionEstimada: fechaDevolucionEstimada ? new Date(fechaDevolucionEstimada) : null,
          observaciones: observaciones || null,
          entregadoPorId: session.user.id,
          items: {
            create: items.map((item: any) => ({
              herramientaUnidadId: item.herramientaUnidadId || null,
              catalogoHerramientaId: item.catalogoHerramientaId || null,
              cantidadPrestada: item.cantidadPrestada || 1,
            })),
          },
        },
        include: { items: true },
      })

      // Actualizar estado de unidades + registrar movimientos
      for (const item of prest.items) {
        if (item.herramientaUnidadId) {
          await tx.herramientaUnidad.update({
            where: { id: item.herramientaUnidadId },
            data: { estado: 'prestada' },
          })
          await registrarMovimiento({
            almacenId: almacen.id,
            tipo: 'prestamo_herramienta',
            herramientaUnidadId: item.herramientaUnidadId,
            cantidad: 1,
            usuarioId: session.user.id,
            prestamoHerramientaId: prest.id,
          }, tx as any)
        } else if (item.catalogoHerramientaId) {
          await registrarMovimiento({
            almacenId: almacen.id,
            tipo: 'prestamo_herramienta',
            catalogoHerramientaId: item.catalogoHerramientaId,
            cantidad: item.cantidadPrestada,
            usuarioId: session.user.id,
            prestamoHerramientaId: prest.id,
          }, tx as any)
        }
      }

      // Enlazar préstamo → solicitud, acumular cantidadEntregada por item y recalcular estado.
      if (solicitudHerramientaId) {
        // 1) Link del préstamo a la solicitud.
        await tx.prestamoHerramienta.update({
          where: { id: prest.id },
          data: { solicitudHerramientaId },
        })

        // 2) Acumular cantidadEntregada por cada item del préstamo que matchee un item de la solicitud
        //    (solo para préstamos por cantidad — bulk; unidades serializadas no acumulan aquí).
        const itemsSolicitud = await tx.solicitudHerramientaItem.findMany({
          where: { solicitudId: solicitudHerramientaId },
          select: { id: true, catalogoHerramientaId: true, cantidad: true, cantidadEntregada: true },
        })
        const mapSolicitudItems = new Map(
          itemsSolicitud.map(i => [i.catalogoHerramientaId, i])
        )
        for (const pItem of prest.items) {
          if (!pItem.catalogoHerramientaId) continue
          const sItem = mapSolicitudItems.get(pItem.catalogoHerramientaId)
          if (!sItem) continue
          const nuevaEntregada = Math.min(sItem.cantidad, sItem.cantidadEntregada + pItem.cantidadPrestada)
          await tx.solicitudHerramientaItem.update({
            where: { id: sItem.id },
            data: { cantidadEntregada: nuevaEntregada },
          })
          // Reflejarlo en el map local para cálculo siguiente.
          sItem.cantidadEntregada = nuevaEntregada
        }

        // 3) Recalcular estado: si TODOS los items llegaron al tope pedido → 'atendida'; si no → 'atendida_parcial'.
        const completa = Array.from(mapSolicitudItems.values())
          .every(i => i.cantidadEntregada >= i.cantidad)
        await tx.solicitudHerramienta.update({
          where: { id: solicitudHerramientaId },
          data: {
            estado: completa ? 'atendida' : 'atendida_parcial',
            atendidaPorId: session.user.id,
            fechaAtencion: new Date(),
          },
        })
      }

      return prest
    })

    // Notificación al solicitante según si quedó completa o parcial.
    if (solicitudHerramientaId) {
      const sol = await prisma.solicitudHerramienta.findUnique({
        where: { id: solicitudHerramientaId },
        select: { numero: true, solicitanteId: true, estado: true },
      })
      if (sol) {
        const esParcial = sol.estado === 'atendida_parcial'
        crearNotificacion(prisma, {
          usuarioId: sol.solicitanteId,
          titulo: esParcial
            ? `Entrega parcial de ${sol.numero}`
            : `Tu solicitud ${sol.numero} fue atendida`,
          mensaje: esParcial
            ? 'Se entregó parte de tu solicitud. Logística completará el resto cuando haya stock.'
            : 'Se generó el préstamo de herramientas. Pasa a recogerlas por el almacén.',
          tipo: esParcial ? 'warning' : 'success',
          prioridad: 'media',
          entidadTipo: 'SolicitudHerramienta',
          entidadId: solicitudHerramientaId,
          accionUrl: `/mi-trabajo/herramientas/${solicitudHerramientaId}`,
          accionTexto: 'Ver solicitud',
        })
      }
    }

    return NextResponse.json(prestamo, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear préstamo:', error)
    return NextResponse.json({ error: error.message || 'Error al crear préstamo' }, { status: 500 })
  }
}
