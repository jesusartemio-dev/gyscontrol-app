import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/hoja-de-gastos/[id]/depositos
 * Lista todos los depósitos de la hoja con sus adjuntos.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const depositos = await prisma.depositoHoja.findMany({
      where: { hojaDeGastosId: id },
      include: {
        adjuntos: { orderBy: { createdAt: 'asc' } },
        creadoPor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(depositos)
  } catch (error) {
    console.error('Error al listar depósitos:', error)
    return NextResponse.json({ error: 'Error al listar depósitos' }, { status: 500 })
  }
}

/**
 * POST /api/hoja-de-gastos/[id]/depositos
 * Agrega un depósito adicional (solo cuando la hoja está en estado depositado).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para registrar depósito' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'depositado') {
      return NextResponse.json({ error: 'Solo se pueden agregar depósitos adicionales cuando la hoja está en estado depositado' }, { status: 400 })
    }

    const { monto, descripcion, adjuntoIds = [] } = await req.json()
    if (!monto || monto <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    const deposito = await prisma.$transaction(async (tx) => {
      const dep = await tx.depositoHoja.create({
        data: {
          hojaDeGastosId: id,
          monto,
          fecha: new Date(),
          descripcion: descripcion || null,
          creadoPorId: session.user.id,
          updatedAt: new Date(),
        },
      })

      // Vincular adjuntos al depósito
      if (adjuntoIds.length > 0) {
        await tx.hojaDeGastosAdjunto.updateMany({
          where: { id: { in: adjuntoIds }, hojaDeGastosId: id },
          data: { depositoHojaId: dep.id },
        })
      }

      // Recalcular montoDepositado como suma de todos los depósitos
      const todos = await tx.depositoHoja.findMany({ where: { hojaDeGastosId: id } })
      const nuevoTotal = todos.reduce((s, d) => s + d.monto, 0)

      await tx.hojaDeGastos.update({
        where: { id },
        data: {
          montoDepositado: nuevoTotal,
          saldo: nuevoTotal - hoja.montoGastado,
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'depositado',
          descripcion: `Depósito adicional registrado: S/ ${monto.toFixed(2)}`,
          usuarioId: session.user.id,
          metadata: { monto, depositoId: dep.id, adicional: true },
        },
      })

      return dep
    })

    const full = await prisma.depositoHoja.findUnique({
      where: { id: deposito.id },
      include: { adjuntos: true, creadoPor: { select: { id: true, name: true } } },
    })

    return NextResponse.json(full)
  } catch (error) {
    console.error('Error al agregar depósito:', error)
    return NextResponse.json({ error: 'Error al agregar depósito' }, { status: 500 })
  }
}
