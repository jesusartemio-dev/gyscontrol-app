import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/gasto-comprobante/[id]
 * Obtiene un comprobante con sus líneas y adjuntos.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const comprobante = await prisma.gastoComprobante.findUnique({
      where: { id },
      include: {
        lineas: {
          include: {
            proyecto: { select: { id: true, codigo: true, nombre: true } },
            centroCosto: { select: { id: true, nombre: true } },
            adjuntos: true,
          },
        },
        adjuntos: true,
      },
    })

    if (!comprobante) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
    }

    return NextResponse.json(comprobante)
  } catch (error) {
    console.error('Error al obtener comprobante:', error)
    return NextResponse.json({ error: 'Error al obtener comprobante' }, { status: 500 })
  }
}

/**
 * DELETE /api/gasto-comprobante/[id]
 * Elimina un comprobante y sus líneas (solo si la hoja está en aprobado/depositado).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const comprobante = await prisma.gastoComprobante.findUnique({
      where: { id },
      include: { hojaDeGastos: { select: { estado: true } } },
    })

    if (!comprobante) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
    }
    if (!['aprobado', 'depositado'].includes(comprobante.hojaDeGastos.estado)) {
      return NextResponse.json(
        { error: 'No se puede eliminar el comprobante en este estado' },
        { status: 409 }
      )
    }

    // Las líneas se eliminan en cascada por FK de GastoLinea.gastoComprobanteId? No, no hay cascade.
    // Necesitamos desvincular o borrar líneas primero.
    await prisma.$transaction(async (tx) => {
      // Desvincular las líneas del comprobante (no se borran, se convierten en líneas sueltas)
      await tx.gastoLinea.updateMany({
        where: { gastoComprobanteId: id },
        data: { gastoComprobanteId: null },
      })
      await tx.gastoComprobante.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar comprobante:', error)
    return NextResponse.json({ error: 'Error al eliminar comprobante' }, { status: 500 })
  }
}
