import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/hoja-de-gastos/[id]/sin-anticipo
 *
 * Caso de uso: el empleado gastó de su bolsillo — la empresa nunca le dio
 * un anticipo. El admin usa esta acción para:
 *  1. Marcar la hoja como "no requiere anticipo" (requiereAnticipo = false)
 *  2. Si ya tiene líneas válidas + todos los comprobantes, avanzar a "rendido"
 *     en la misma transacción. Si no, se queda en "aprobado" y el empleado
 *     completará la rendición normalmente.
 *
 * Restricciones:
 *  - Solo desde estado "aprobado"
 *  - No debe existir ningún DepositoHoja (si ya hubo dinero, este camino
 *    no aplica — debe usarse el flujo normal).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para marcar sin anticipo' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id },
      include: { lineas: true, itemsMateriales: true, depositos: true },
    })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'aprobado') {
      return NextResponse.json({ error: 'Solo se puede marcar sin anticipo desde estado aprobado' }, { status: 400 })
    }
    if (hoja.depositos.length > 0) {
      return NextResponse.json(
        { error: 'Esta hoja ya tiene depósitos registrados — debe seguirse el flujo normal' },
        { status: 400 }
      )
    }

    // ¿Podemos avanzar directamente a rendido?
    // Requiere: líneas de gasto + todos los items de materiales con comprobante.
    const tieneLineas = hoja.lineas.length > 0
    const itemsSinComprobante = hoja.itemsMateriales.filter(i => i.precioReal == null)
    const puedeRendir = tieneLineas && itemsSinComprobante.length === 0

    const montoGastado = hoja.lineas.reduce((sum, l) => sum + l.monto, 0)
    const saldoFinal = puedeRendir ? -montoGastado : 0  // negativo = a reembolsar al empleado

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          requiereAnticipo: false,
          montoAnticipo: 0,
          montoDepositado: 0,
          ...(puedeRendir
            ? {
                estado: 'rendido',
                montoGastado,
                saldo: saldoFinal,
                fechaRendicion: new Date(),
              }
            : {}),
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: puedeRendir ? 'rendido' : 'actualizado',
          descripcion: puedeRendir
            ? `Marcado sin anticipo y rendido directo. Empleado gastó S/ ${montoGastado.toFixed(2)} de su bolsillo — pendiente de reembolso.`
            : 'Marcado como sin anticipo. El empleado rendirá directamente cuando registre las líneas de gasto.',
          estadoAnterior: 'aprobado',
          estadoNuevo: puedeRendir ? 'rendido' : 'aprobado',
          usuarioId: session.user.id,
          metadata: { sinAnticipo: true, montoGastado, saldoFinal, rindeDirecto: puedeRendir },
        },
      })

      // Si es compra de materiales y rindió directo, crear RecepcionPendiente
      // (misma lógica que en /rendir cuando !requiereAnticipo).
      const esCompra = (hoja as any).tipoPropósito === 'compra_materiales'
      if (puedeRendir && esCompra && hoja.itemsMateriales.length > 0) {
        for (const reqItem of hoja.itemsMateriales) {
          const existe = await tx.recepcionPendiente.findFirst({
            where: {
              requerimientoMaterialItemId: reqItem.id,
              estado: { notIn: ['rechazado'] },
            },
          })
          if (existe) continue
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
      }

      return updated
    })

    return NextResponse.json({
      ...data,
      _info: puedeRendir
        ? 'Marcada sin anticipo y rendida. Saldo negativo = reembolso pendiente al empleado.'
        : 'Marcada sin anticipo. Rinde directo cuando estén las líneas de gasto.',
    })
  } catch (error) {
    console.error('Error al marcar sin anticipo:', error)
    return NextResponse.json({ error: 'Error al marcar sin anticipo' }, { status: 500 })
  }
}
