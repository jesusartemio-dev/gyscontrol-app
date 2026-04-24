import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/hoja-de-gastos/[id]/revisar
 *
 * Transición rendido → revisado.
 * El admin/administración revisa que todos los documentos de la rendición estén
 * conformes. Es el paso previo a la validación final del coordinador.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para revisar' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'rendido') {
      return NextResponse.json({ error: 'Solo se puede marcar como revisado desde estado rendido' }, { status: 400 })
    }

    // Verificar conformidad según el tipo de propósito (igual que antes lo hacía /validar)
    const esMateriales = hoja.tipoPropósito === 'compra_materiales'

    if (esMateriales) {
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
          error: `${lineasPendientes.length} línea(s) sin conformidad. Revise todas las líneas antes de marcar como revisado.`,
        }, { status: 400 })
      }

      const items = await prisma.requerimientoMaterialItem.findMany({
        where: { hojaDeGastosId: id },
        select: { id: true, conformidad: true },
      })
      if (items.length > 0) {
        const itemsPendientes = items.filter(i => i.conformidad !== 'conforme')
        if (itemsPendientes.length > 0) {
          return NextResponse.json({
            error: `${itemsPendientes.length} ítem(s) de materiales sin conformidad. Revise todos los ítems antes de marcar como revisado.`,
          }, { status: 400 })
        }
      }
    } else {
      const lineas = await prisma.gastoLinea.findMany({
        where: { hojaDeGastosId: id },
        select: { id: true, conformidad: true },
      })
      if (lineas.length > 0) {
        const pendientes = lineas.filter(l => l.conformidad !== 'conforme')
        if (pendientes.length > 0) {
          return NextResponse.json({
            error: `${pendientes.length} línea(s) sin conformidad. Revise todas las líneas antes de marcar como revisado.`,
          }, { status: 400 })
        }
      }
    }

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'revisado',
          fechaRevision: new Date(),
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'revisado',
          descripcion: `Revisado por ${session.user.name}`,
          estadoAnterior: 'rendido',
          estadoNuevo: 'revisado',
          usuarioId: session.user.id,
        },
      })

      return updated
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al marcar como revisado:', error)
    return NextResponse.json({ error: 'Error al marcar como revisado' }, { status: 500 })
  }
}
