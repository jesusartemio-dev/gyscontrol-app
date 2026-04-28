import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularAdelantoValorizacion } from '@/lib/utils/adelantoUtils'
import { canDelete } from '@/lib/utils/deleteValidation'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

function calcularMontos(data: {
  montoValorizacion: number
  acumuladoAnterior: number
  presupuestoContractual: number
  descuentoComercialPorcentaje: number
  adelantoPorcentaje: number
  igvPorcentaje: number
  fondoGarantiaPorcentaje: number
}) {
  const acumuladoActual = data.acumuladoAnterior + data.montoValorizacion
  const saldoPorValorizar = data.presupuestoContractual - acumuladoActual
  const porcentajeAvance = data.presupuestoContractual > 0
    ? (acumuladoActual / data.presupuestoContractual) * 100
    : 0

  const descuentoComercialMonto = data.montoValorizacion * data.descuentoComercialPorcentaje / 100
  const adelantoMonto = data.montoValorizacion * data.adelantoPorcentaje / 100
  const subtotal = data.montoValorizacion - descuentoComercialMonto - adelantoMonto
  const igvMonto = subtotal * data.igvPorcentaje / 100
  const fondoGarantiaMonto = subtotal * data.fondoGarantiaPorcentaje / 100
  const netoARecibir = subtotal + igvMonto - fondoGarantiaMonto

  return {
    acumuladoActual: Math.round(acumuladoActual * 100) / 100,
    saldoPorValorizar: Math.round(saldoPorValorizar * 100) / 100,
    porcentajeAvance: Math.round(porcentajeAvance * 100) / 100,
    descuentoComercialMonto: Math.round(descuentoComercialMonto * 100) / 100,
    adelantoMonto: Math.round(adelantoMonto * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    igvMonto: Math.round(igvMonto * 100) / 100,
    fondoGarantiaMonto: Math.round(fondoGarantiaMonto * 100) / 100,
    netoARecibir: Math.round(netoARecibir * 100) / 100,
  }
}

async function calcularAcumuladoAnterior(proyectoId: string, excludeId: string): Promise<number> {
  const agg = await prisma.valorizacion.aggregate({
    where: {
      proyectoId,
      estado: { not: 'anulada' },
      id: { not: excludeId },
    },
    _sum: { montoValorizacion: true },
  })
  return agg._sum.montoValorizacion || 0
}

const includeRelations = {
  proyecto: { select: { id: true, codigo: true, nombre: true, totalCliente: true, clienteId: true, adelantoPorcentaje: true, adelantoMonto: true, adelantoAmortizado: true } },
  adjuntos: true,
  cuentasPorCobrar: true,
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; valId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { valId } = await params
    const valorizacion = await prisma.valorizacion.findUnique({
      where: { id: valId },
      include: includeRelations,
    })
    if (!valorizacion) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    return NextResponse.json(valorizacion)
  } catch (error) {
    console.error('Error al obtener valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; valId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: proyectoId, valId } = await params
    const body = await req.json()

    const existing = await prisma.valorizacion.findUnique({ where: { id: valId } })
    if (!existing) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    // Validación de transiciones de estado
    const TRANSICIONES: Record<string, string[]> = {
      borrador:         ['enviada', 'anulada'],
      enviada:          ['observada', 'aprobada_cliente', 'borrador', 'anulada'],
      observada:        ['corregida', 'enviada', 'anulada'],
      corregida:        ['observada', 'aprobada_cliente', 'enviada', 'anulada'],
      aprobada_cliente: ['facturada', 'enviada', 'anulada'],
      facturada:        ['pagada', 'aprobada_cliente', 'anulada'],
      pagada:           ['facturada', 'anulada'],
      anulada:          [],
    }

    if (body.estado && body.estado !== existing.estado) {
      const permitidas = TRANSICIONES[existing.estado] || []
      if (!permitidas.includes(body.estado)) {
        return NextResponse.json(
          { error: `Transición no permitida: ${existing.estado} → ${body.estado}` },
          { status: 400 }
        )
      }
    }

    // Campos automáticos según estado
    let extraCampos: Record<string, any> = {}
    if (body.estado && body.estado !== existing.estado) {
      switch (body.estado) {
        case 'enviada':
          extraCampos = { fechaEnvio: new Date() }
          break
        case 'observada':
          extraCampos = {
            fechaObservacion: new Date(),
            motivoObservacion: body.motivoObservacion ?? null,
            ciclosAprobacion: { increment: 1 },
          }
          break
        case 'corregida':
          extraCampos = { fechaCorreccion: new Date() }
          break
        case 'aprobada_cliente':
          extraCampos = { fechaAprobacion: new Date() }
          break
      }
    }

    // Manejo de cambio de estado
    if (body.estado && body.estado !== existing.estado) {
      // Amortización de adelanto al aprobar
      if (body.estado === 'aprobada_cliente' && existing.adelantoMonto > 0) {
        await prisma.proyecto.update({
          where: { id: proyectoId },
          data: {
            adelantoAmortizado: { increment: existing.adelantoMonto },
          },
        })
      }

      // Revertir amortización al anular desde estado post-aprobación
      const estadosPostAprobacion = ['aprobada_cliente', 'facturada', 'pagada']
      if (body.estado === 'anulada' && estadosPostAprobacion.includes(existing.estado) && existing.adelantoMonto > 0) {
        await prisma.proyecto.update({
          where: { id: proyectoId },
          data: {
            adelantoAmortizado: { decrement: existing.adelantoMonto },
          },
        })
      }

      // Al anular desde facturada/pagada: anular CxC asociadas
      const estadosConCxC = ['facturada', 'pagada']
      if (body.estado === 'anulada' && estadosConCxC.includes(existing.estado)) {
        await prisma.cuentaPorCobrar.updateMany({
          where: { valorizacionId: valId, estado: { not: 'anulada' } },
          data: { estado: 'anulada', updatedAt: new Date() },
        })
      }

      // Revertir facturación (facturada → aprobada_cliente): anular CxC asociadas
      if (existing.estado === 'facturada' && body.estado === 'aprobada_cliente') {
        await prisma.cuentaPorCobrar.updateMany({
          where: { valorizacionId: valId, estado: { not: 'anulada' } },
          data: { estado: 'anulada', updatedAt: new Date() },
        })
      }

      // Revertir aprobación (aprobada_cliente → enviada): revertir amortización adelanto
      if (existing.estado === 'aprobada_cliente' && body.estado === 'enviada' && existing.adelantoMonto > 0) {
        await prisma.proyecto.update({
          where: { id: proyectoId },
          data: {
            adelantoAmortizado: { decrement: existing.adelantoMonto },
          },
        })
      }

      // Transición a "facturada": opcionalmente crear CuentaPorCobrar
      if (body.estado === 'facturada' && body.crearCuentaCobrar) {
        const proyecto = await prisma.proyecto.findUnique({
          where: { id: proyectoId },
          select: { clienteId: true },
        })
        if (proyecto) {
          await prisma.cuentaPorCobrar.create({
            data: {
              proyectoId,
              clienteId: proyecto.clienteId!,
              valorizacionId: valId,
              numeroDocumento: body.numeroDocumento || null,
              descripcion: `Valorización ${existing.codigo}`,
              monto: existing.netoARecibir,
              moneda: existing.moneda,
              tipoCambio: existing.tipoCambio,
              saldoPendiente: existing.netoARecibir,
              fechaEmision: new Date(),
              fechaVencimiento: body.fechaVencimiento
                ? new Date(body.fechaVencimiento)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días default
              condicionPago: body.condicionPago || null,
              diasCredito: body.diasCredito ? Number(body.diasCredito) : null,
              metodoPago: body.metodoPago || null,
              bancoFinanciera: body.bancoFinanciera || null,
              updatedAt: new Date(),
            },
          })
        }
      }
    }

    // Recalcular si cambian montos
    const montoValorizacion = body.montoValorizacion ?? existing.montoValorizacion
    const presupuestoContractual = body.presupuestoContractual ?? existing.presupuestoContractual
    const descuentoComercialPorcentaje = body.descuentoComercialPorcentaje ?? existing.descuentoComercialPorcentaje
    const igvPorcentaje = body.igvPorcentaje ?? existing.igvPorcentaje
    const fondoGarantiaPorcentaje = body.fondoGarantiaPorcentaje ?? existing.fondoGarantiaPorcentaje

    // Recalcular adelanto desde proyecto si está en borrador y el proyecto tiene adelanto
    let adelantoPorcentaje = body.adelantoPorcentaje ?? existing.adelantoPorcentaje
    let adelantoMontoOverride: number | undefined

    const estadoFinal = body.estado ?? existing.estado
    if (estadoFinal === 'borrador') {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: { adelantoPorcentaje: true, adelantoMonto: true, adelantoAmortizado: true },
      })
      if (proyecto && proyecto.adelantoMonto > 0) {
        const adelantoCalc = calcularAdelantoValorizacion(
          proyecto,
          montoValorizacion,
          body.adelantoMontoManual
        )
        if (adelantoCalc.tieneAdelanto) {
          adelantoPorcentaje = adelantoCalc.adelantoPorcentaje
          adelantoMontoOverride = adelantoCalc.adelantoMonto
        }
      }
    }

    const acumuladoAnterior = await calcularAcumuladoAnterior(proyectoId, valId)
    const calculados = calcularMontos({
      montoValorizacion,
      acumuladoAnterior,
      presupuestoContractual,
      descuentoComercialPorcentaje,
      adelantoPorcentaje,
      igvPorcentaje,
      fondoGarantiaPorcentaje,
    })

    // Si se usó el helper, sobrescribir el adelantoMonto calculado
    if (adelantoMontoOverride !== undefined) {
      calculados.adelantoMonto = adelantoMontoOverride
    }

    // Bloqueo: condiciones de pago no editables si la valorización está en estado final
    // (ya facturada, pagada, aprobada_cliente o anulada). Solo editables en borrador/enviada/observada/corregida.
    const ESTADOS_PAGO_BLOQUEADOS = ['aprobada_cliente', 'facturada', 'pagada', 'anulada']
    const tocaPago = body.condicionPago !== undefined || body.formaPago !== undefined
                  || body.diasCredito !== undefined || body.notasPago !== undefined
    if (tocaPago && ESTADOS_PAGO_BLOQUEADOS.includes(existing.estado)) {
      const cambiaCampoPago =
        (body.condicionPago !== undefined && body.condicionPago !== existing.condicionPago) ||
        (body.formaPago !== undefined && body.formaPago !== existing.formaPago) ||
        (body.diasCredito !== undefined && body.diasCredito !== existing.diasCredito) ||
        (body.notasPago !== undefined && body.notasPago !== existing.notasPago)
      if (cambiaCampoPago) {
        return NextResponse.json(
          { error: `No se pueden modificar las condiciones de pago en estado "${existing.estado}". Anule la valorización si necesita cambios.` },
          { status: 400 }
        )
      }
    }

    const valorizacion = await prisma.valorizacion.update({
      where: { id: valId },
      data: {
        ...(body.periodoInicio && { periodoInicio: new Date(body.periodoInicio) }),
        ...(body.periodoFin && { periodoFin: new Date(body.periodoFin) }),
        ...(body.moneda !== undefined && { moneda: body.moneda }),
        ...(body.tipoCambio !== undefined && { tipoCambio: body.tipoCambio }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...extraCampos,
        ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
        ...(body.condicionPago !== undefined && { condicionPago: body.condicionPago || null }),
        ...(body.formaPago !== undefined && { formaPago: body.formaPago || null }),
        ...(body.diasCredito !== undefined && { diasCredito: body.diasCredito ?? null }),
        ...(body.notasPago !== undefined && { notasPago: body.notasPago || null }),
        presupuestoContractual,
        montoValorizacion,
        acumuladoAnterior,
        descuentoComercialPorcentaje,
        adelantoPorcentaje,
        igvPorcentaje,
        fondoGarantiaPorcentaje,
        ...calculados,
        updatedAt: new Date(),
      },
      include: includeRelations,
    })

    // Auditoría: registrar cambios en condiciones de pago
    if (tocaPago && existing) {
      const cambios: Record<string, { antes: any; despues: any }> = {}
      if (body.condicionPago !== undefined && body.condicionPago !== existing.condicionPago)
        cambios.condicionPago = { antes: existing.condicionPago, despues: body.condicionPago || null }
      if (body.formaPago !== undefined && body.formaPago !== existing.formaPago)
        cambios.formaPago = { antes: existing.formaPago, despues: body.formaPago || null }
      if (body.diasCredito !== undefined && body.diasCredito !== existing.diasCredito)
        cambios.diasCredito = { antes: existing.diasCredito, despues: body.diasCredito ?? null }
      if (body.notasPago !== undefined && body.notasPago !== existing.notasPago)
        cambios.notasPago = { antes: existing.notasPago, despues: body.notasPago || null }

      if (Object.keys(cambios).length > 0) {
        try {
          await prisma.eventoTrazabilidad.create({
            data: {
              id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              tipo: 'valorizacion_pago_actualizado',
              descripcion: `Condiciones de pago actualizadas en valorización ${valorizacion.codigo}`,
              usuarioId: session.user.id,
              metadata: { valorizacionId: valId, proyectoId, cambios },
              updatedAt: new Date(),
            },
          })
        } catch (e) {
          console.warn('No se pudo crear evento de auditoría:', e)
        }
      }
    }

    return NextResponse.json(valorizacion)
  } catch (error) {
    console.error('Error al actualizar valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; valId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { valId } = await params

    // 🛡️ Validar dependientes antes de eliminar
    const deleteCheck = await canDelete('valorizacion', valId)
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    // Desvincular CxC (nullificar FK) antes de eliminar
    await prisma.cuentaPorCobrar.updateMany({
      where: { valorizacionId: valId },
      data: { valorizacionId: null },
    })

    // Eliminar valorización (partidas y adjuntos se eliminan por cascade)
    await prisma.valorizacion.delete({ where: { id: valId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
