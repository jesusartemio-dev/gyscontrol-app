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
      return NextResponse.json({ error: 'Sin permisos para validar' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'rendido') {
      return NextResponse.json({ error: 'Solo se puede validar desde estado rendido' }, { status: 400 })
    }

    // Verificar conformidad según el tipo de propósito
    // Para compra_materiales: las líneas de comprobantes (gastoComprobanteId != null)
    // se validan a través del RequerimientoMaterialItem, no de GastoLinea directamente.
    const esMateriales = hoja.tipoPropósito === 'compra_materiales'

    if (esMateriales) {
      // Líneas libres: sin comprobante compartido y sin ítem de material (sin-documento).
      // Las líneas de comprobante se validan vía item; las sin-documento via item.conformidad.
      const lineasLibres = await prisma.gastoLinea.findMany({
        where: {
          hojaDeGastosId: id,
          gastoComprobanteId: null,
          requerimientoMaterialItemId: null,
        },
        select: { id: true, conformidad: true },
      })
      const lineasPendientes = lineasLibres.filter(l => l.conformidad !== 'conforme')
      if (lineasPendientes.length > 0) {
        return NextResponse.json({
          error: `${lineasPendientes.length} línea(s) sin conformidad. Revise todas las líneas antes de validar.`,
        }, { status: 400 })
      }

      // Ítems de materiales deben ser conformes
      const items = await prisma.requerimientoMaterialItem.findMany({
        where: { hojaDeGastosId: id },
        select: { id: true, conformidad: true },
      })
      if (items.length > 0) {
        const itemsPendientes = items.filter(i => i.conformidad !== 'conforme')
        if (itemsPendientes.length > 0) {
          return NextResponse.json({
            error: `${itemsPendientes.length} ítem(s) de materiales sin conformidad. Revise todos los ítems antes de validar.`,
          }, { status: 400 })
        }
      }
    } else {
      // Hoja de gastos normal: todas las líneas deben ser conformes
      const lineas = await prisma.gastoLinea.findMany({
        where: { hojaDeGastosId: id },
        select: { id: true, conformidad: true },
      })
      if (lineas.length > 0) {
        const pendientes = lineas.filter(l => l.conformidad !== 'conforme')
        if (pendientes.length > 0) {
          return NextResponse.json({
            error: `${pendientes.length} línea(s) sin conformidad. Revise todas las líneas antes de validar.`,
          }, { status: 400 })
        }
      }
    }

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'validado',
          fechaValidacion: new Date(),
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'validado',
          descripcion: `Validado por ${session.user.name}`,
          estadoAnterior: 'rendido',
          estadoNuevo: 'validado',
          usuarioId: session.user.id,
        },
      })

      // Recalcular totalRealGastos del proyecto si aplica
      if (hoja.proyectoId) {
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
    console.error('Error al validar:', error)
    return NextResponse.json({ error: 'Error al validar' }, { status: 500 })
  }
}
