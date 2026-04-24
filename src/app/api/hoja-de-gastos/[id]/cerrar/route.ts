import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para cerrar' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id },
      include: {
        itemsMateriales: {
          include: {
            pedidoEquipoItem: {
              select: { id: true, codigo: true, descripcion: true }
            }
          }
        }
      }
    })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'validado') {
      return NextResponse.json({ error: 'Solo se puede cerrar desde estado validado' }, { status: 400 })
    }

    // Validar que el saldo esté cuadrado antes de cerrar.
    // Para hojas que requirieron anticipo, exigimos saldo === 0 (todos los reembolsos
    // y devoluciones deben haberse registrado). Para gastos sin anticipo se permite
    // saldo negativo equivalente a -montoGastado (no se hizo reembolso) —
    // este caso queda como reembolso pendiente fuera del sistema; no bloqueamos cierre.
    const esCompra = (hoja as any).tipoPropósito === 'compra_materiales'

    if (!esCompra && hoja.requiereAnticipo && Math.abs(hoja.saldo) > 0.01) {
      const accion = hoja.saldo > 0 ? 'devolución' : 'reembolso'
      return NextResponse.json({
        error: `No se puede cerrar: hay saldo pendiente de S/ ${Math.abs(hoja.saldo).toFixed(2)}. Registre la ${accion} antes de cerrar.`,
      }, { status: 400 })
    }

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'cerrado',
          fechaCierre: new Date(),
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'cerrado',
          descripcion: `Cerrado por ${session.user.name}`,
          estadoAnterior: 'validado',
          estadoNuevo: 'cerrado',
          usuarioId: session.user.id,
        },
      })

      // ─── Requerimiento de materiales: crear RecepcionPendiente por item ───
      if (esCompra && hoja.itemsMateriales.length > 0) {
        for (const reqItem of hoja.itemsMateriales) {
          // Solo crear si no tiene ya una recepción activa
          const recepcionExistente = await tx.recepcionPendiente.findFirst({
            where: {
              requerimientoMaterialItemId: reqItem.id,
              estado: { notIn: ['rechazado'] },
            },
          })
          if (recepcionExistente) continue

          await tx.recepcionPendiente.create({
            data: {
              pedidoEquipoItemId: reqItem.pedidoEquipoItemId,
              requerimientoMaterialItemId: reqItem.id,
              cantidadRecibida: reqItem.cantidadSolicitada,
              estado: 'pendiente',
              observaciones: `Compra por ${hoja.numero} — ${reqItem.descripcion}`,
            },
          })
        }

        // Registrar evento de trazabilidad
        await tx.eventoTrazabilidad.create({
          data: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tipo: 'recepcion_creada_desde_requerimiento',
            descripcion: `${hoja.itemsMateriales.length} recepcion(es) creadas desde requerimiento ${hoja.numero}`,
            usuarioId: session.user.id,
            metadata: {
              hojaDeGastosId: id,
              hojaNumero: hoja.numero,
              itemCount: hoja.itemsMateriales.length,
            },
            updatedAt: new Date(),
          }
        })
      }

      // ─── Gastos viáticos: recalcular totalRealGastos del proyecto ─────────
      if (!esCompra && hoja.proyectoId) {
        const agg = await tx.hojaDeGastos.aggregate({
          where: {
            proyectoId: hoja.proyectoId,
            estado: { in: ['validado', 'cerrado'] },
          },
          _sum: { montoGastado: true },
        })
        await tx.proyecto.update({
          where: { id: hoja.proyectoId },
          data: { totalRealGastos: agg._sum.montoGastado || 0 },
        })
      }

      return updated
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al cerrar:', error)
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 })
  }
}
