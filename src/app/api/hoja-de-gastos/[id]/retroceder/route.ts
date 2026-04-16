import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Estado anterior en el flujo normal
function estadoAnterior(estado: string, requiereAnticipo: boolean): string | null {
  switch (estado) {
    case 'enviado':    return 'borrador'
    case 'aprobado':   return 'enviado'
    case 'depositado': return 'aprobado'
    case 'rendido':    return requiereAnticipo ? 'depositado' : 'aprobado'
    case 'validado':   return 'rendido'
    case 'cerrado':    return 'validado'
    default:           return null
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para retroceder estado' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }

    const estadoPrevio = estadoAnterior(hoja.estado, hoja.requiereAnticipo)
    if (!estadoPrevio) {
      return NextResponse.json({ error: 'No se puede retroceder desde este estado' }, { status: 400 })
    }

    const estadoActual = hoja.estado

    // Campos a limpiar según el estado desde el que se retrocede
    const extraData: Record<string, any> = {}
    if (estadoActual === 'enviado') {
      extraData.fechaEnvio = null
    }
    if (estadoActual === 'aprobado') {
      extraData.aprobadorId = null
      extraData.fechaAprobacion = null
    }
    if (estadoActual === 'depositado') {
      extraData.fechaDeposito = null
      // Los DepositoHoja se conservan para que el admin pueda re-avanzar sin re-registrar
      // Recalcular montoDepositado desde los depósitos existentes
      const depositosExistentes = await prisma.depositoHoja.findMany({ where: { hojaDeGastosId: id } })
      const totalDepositos = depositosExistentes.reduce((s, d) => s + d.monto, 0)
      extraData.montoDepositado = totalDepositos
      extraData.saldo = totalDepositos - hoja.montoGastado
    }
    if (estadoActual === 'rendido') {
      extraData.fechaRendicion = null
    }

    // Si el destino es un estado pre-rendido, limpiar precioReal/totalReal de los ítems
    // SOLO si no hay comprobantes registrados: si existen comprobantes, el precioReal fue asignado
    // por ellos y debe conservarse (los comprobantes no se eliminan al retroceder).
    const ESTADOS_PRE_RENDIDO = ['borrador', 'enviado', 'aprobado', 'depositado']
    if (ESTADOS_PRE_RENDIDO.includes(estadoPrevio)) {
      const comprobantesExistentes = await prisma.gastoComprobante.count({ where: { hojaDeGastosId: id } })
      if (comprobantesExistentes === 0) {
        await prisma.requerimientoMaterialItem.updateMany({
          where: { hojaDeGastosId: id },
          data: { precioReal: null, totalReal: null, updatedAt: new Date() },
        })
      }
    }
    if (estadoActual === 'validado') {
      extraData.fechaValidacion = null
    }
    if (estadoActual === 'cerrado') {
      extraData.fechaCierre = null
    }

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: estadoPrevio,
          rechazadoEn: null,
          comentarioRechazo: null,
          updatedAt: new Date(),
          ...extraData,
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'retrocedido',
          descripcion: `Estado retrocedido de "${estadoActual}" a "${estadoPrevio}"`,
          estadoAnterior: estadoActual,
          estadoNuevo: estadoPrevio,
          usuarioId: session.user.id,
          metadata: { motivo: 'retroceso_manual' },
        },
      })

      return updated
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al retroceder estado:', error)
    return NextResponse.json({ error: 'Error al retroceder estado' }, { status: 500 })
  }
}
