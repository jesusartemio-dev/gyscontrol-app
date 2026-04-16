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
 * - tipo "anticipo": solo admin/gerente/administracion, estados aprobado/depositado
 * - tipo "devolucion": solo el empleado dueño de la hoja, estado rendido
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }

    const { monto, descripcion, adjuntoIds = [], tipo = 'anticipo' } = await req.json()

    if (!monto || monto <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    // Validar permisos y estado según el tipo
    if (tipo === 'anticipo') {
      if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Sin permisos para registrar anticipo' }, { status: 403 })
      }
      if (!['aprobado', 'depositado'].includes(hoja.estado)) {
        return NextResponse.json({
          error: 'Solo se pueden registrar anticipos cuando la hoja está en estado aprobado o depositado',
        }, { status: 400 })
      }
    } else if (tipo === 'devolucion') {
      if (hoja.empleadoId !== session.user.id) {
        return NextResponse.json({ error: 'Solo el empleado del requerimiento puede registrar una devolución' }, { status: 403 })
      }
      if (hoja.estado !== 'rendido') {
        return NextResponse.json({ error: 'Solo se pueden registrar devoluciones cuando la hoja está en estado rendido' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Tipo de depósito inválido' }, { status: 400 })
    }

    const deposito = await prisma.$transaction(async (tx) => {
      const dep = await tx.depositoHoja.create({
        data: {
          hojaDeGastosId: id,
          monto,
          fecha: new Date(),
          descripcion: descripcion || null,
          tipo,
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

      // Solo los anticipos afectan montoDepositado/saldo
      if (tipo === 'anticipo') {
        const todos = await tx.depositoHoja.findMany({
          where: { hojaDeGastosId: id, tipo: 'anticipo' },
        })
        const nuevoTotal = todos.reduce((s, d) => s + d.monto, 0)
        await tx.hojaDeGastos.update({
          where: { id },
          data: {
            montoDepositado: nuevoTotal,
            saldo: nuevoTotal - hoja.montoGastado,
            updatedAt: new Date(),
          },
        })
      }

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: tipo === 'devolucion' ? 'comentario' : 'depositado',
          descripcion: tipo === 'devolucion'
            ? `Devolución registrada: S/ ${monto.toFixed(2)}`
            : `Anticipo registrado: S/ ${monto.toFixed(2)}`,
          usuarioId: session.user.id,
          metadata: { monto, depositoId: dep.id, tipoDeposito: tipo },
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
