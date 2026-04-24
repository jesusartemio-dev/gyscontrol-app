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
 * Tipos de depósito:
 *   - "anticipo"   → empresa → empleado, ANTES de gastar (aprobado/depositado/rendido)
 *   - "reembolso"  → empresa → empleado, DESPUÉS de validar (rendido/validado), solo si saldo < 0
 *   - "devolucion" → empleado → empresa, DESPUÉS de gastar (depositado/rendido/validado), solo si saldo > 0
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
      if (!['aprobado', 'depositado', 'rendido'].includes(hoja.estado)) {
        return NextResponse.json({
          error: 'Solo se pueden registrar anticipos cuando la hoja está en estado aprobado, depositado o rendido',
        }, { status: 400 })
      }
    } else if (tipo === 'reembolso') {
      if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Sin permisos para registrar reembolso' }, { status: 403 })
      }
      if (hoja.estado !== 'validado') {
        return NextResponse.json({
          error: 'Solo se pueden registrar reembolsos cuando la hoja está en estado validado',
        }, { status: 400 })
      }
      if (hoja.saldo >= 0) {
        return NextResponse.json({
          error: 'No hay saldo pendiente por reembolsar al empleado',
        }, { status: 400 })
      }
      if (monto > Math.abs(hoja.saldo) + 0.01) {
        return NextResponse.json({
          error: `El monto del reembolso (S/ ${monto.toFixed(2)}) excede el saldo pendiente (S/ ${Math.abs(hoja.saldo).toFixed(2)})`,
        }, { status: 400 })
      }
    } else if (tipo === 'devolucion') {
      const esEmpleado = hoja.empleadoId === session.user.id
      const esAdmin = ['admin', 'gerente', 'administracion'].includes(session.user.role)
      if (!esEmpleado && !esAdmin) {
        return NextResponse.json({ error: 'Sin permisos para registrar esta devolución' }, { status: 403 })
      }
      if (hoja.estado !== 'validado') {
        return NextResponse.json({ error: 'Solo se pueden registrar devoluciones cuando la hoja está en estado validado' }, { status: 400 })
      }
      if (hoja.saldo <= 0) {
        return NextResponse.json({ error: 'No hay saldo pendiente por devolver a la empresa' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Tipo de depósito inválido. Debe ser anticipo, reembolso o devolucion' }, { status: 400 })
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

      // Recalcular saldo = (anticipos + reembolsos) - gastos - devoluciones
      const [anticipos, reembolsos, devoluciones] = await Promise.all([
        tx.depositoHoja.findMany({ where: { hojaDeGastosId: id, tipo: 'anticipo' } }),
        tx.depositoHoja.findMany({ where: { hojaDeGastosId: id, tipo: 'reembolso' } }),
        tx.depositoHoja.findMany({ where: { hojaDeGastosId: id, tipo: 'devolucion' } }),
      ])
      const totalAnticipos = anticipos.reduce((s, d) => s + d.monto, 0)
      const totalReembolsos = reembolsos.reduce((s, d) => s + d.monto, 0)
      const totalDevoluciones = devoluciones.reduce((s, d) => s + d.monto, 0)
      await tx.hojaDeGastos.update({
        where: { id },
        data: {
          montoDepositado: totalAnticipos + totalReembolsos,
          saldo: totalAnticipos + totalReembolsos - hoja.montoGastado - totalDevoluciones,
          updatedAt: new Date(),
        },
      })

      const descripcionEvento =
        tipo === 'devolucion' ? `Devolución registrada: S/ ${monto.toFixed(2)}` :
        tipo === 'reembolso'  ? `Reembolso al empleado registrado: S/ ${monto.toFixed(2)}` :
        `Anticipo registrado: S/ ${monto.toFixed(2)}`

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: tipo === 'devolucion' ? 'comentario' : 'depositado',
          descripcion: descripcionEvento,
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
