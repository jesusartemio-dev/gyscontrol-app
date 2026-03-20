import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearEvento } from '@/lib/utils/trazabilidad'

const ROLES_ALLOWED = ['admin', 'gerente', 'logistico', 'coordinador_logistico', 'administracion']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para completar OC' }, { status: 403 })
    }

    const { id } = await params
    const oc = await prisma.ordenCompra.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!oc) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }

    if (!['confirmada', 'parcial'].includes(oc.estado)) {
      return NextResponse.json(
        { error: 'Solo se puede completar desde estado confirmada o parcial' },
        { status: 400 }
      )
    }

    if (oc.requiereRecepcion) {
      return NextResponse.json(
        { error: 'Esta OC requiere recepción física. Use el flujo de recepción.' },
        { status: 400 }
      )
    }

    // Mark all items as fully received and complete the OC
    await prisma.$transaction(async (tx) => {
      for (const item of oc.items) {
        await tx.ordenCompraItem.update({
          where: { id: item.id },
          data: { cantidadRecibida: item.cantidad, updatedAt: new Date() },
        })
      }

      await tx.ordenCompra.update({
        where: { id },
        data: { estado: 'completada', updatedAt: new Date() },
      })

      await crearEvento(tx, {
        proyectoId: oc.proyectoId,
        tipo: 'oc_completada',
        descripcion: `OC ${oc.numero} completada sin recepción (servicio)`,
        usuarioId: session.user.id,
        metadata: {
          ordenCompraId: id,
          ocNumero: oc.numero,
          sinRecepcion: true,
        },
      })
    })

    const updated = await prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        centroCosto: { select: { id: true, nombre: true, tipo: true } },
        pedidoEquipo: { select: { id: true, codigo: true, estado: true } },
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        solicitante: { select: { id: true, name: true, email: true } },
        aprobador: { select: { id: true, name: true, email: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al completar OC:', error)
    return NextResponse.json({ error: 'Error al completar orden de compra' }, { status: 500 })
  }
}
