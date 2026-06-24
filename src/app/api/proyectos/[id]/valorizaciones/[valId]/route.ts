import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularAdelantoValorizacion } from '@/lib/utils/adelantoUtils'
import { canDelete } from '@/lib/utils/deleteValidation'
import {
  calcularMontos,
  calcularAcumuladoAnterior,
  recalcularValorizacionesPosteriores,
} from '@/lib/utils/valorizacionAcumulado'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

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
      aprobada_cliente: ['hes_pendiente', 'enviada', 'anulada'],
      hes_pendiente:    ['facturada', 'aprobada_cliente', 'anulada'],
      facturada:        ['pagada', 'hes_pendiente', 'aprobada_cliente', 'anulada'],
      pagada:           ['facturada', 'anulada'],
      anulada:          [],
    }

    // Roles permitidos por transición específica
    const ROLES_TRANSICION: Record<string, string[]> = {
      'borrador→enviada':            ['gestor', 'coordinador', 'gerente', 'admin'],
      'borrador→anulada':            ['gerente', 'admin'],
      'enviada→observada':           ['gestor', 'coordinador', 'gerente', 'admin'],
      'enviada→aprobada_cliente':    ['gestor', 'coordinador', 'gerente', 'admin'],
      'enviada→borrador':            ['gestor', 'coordinador', 'gerente', 'admin'],
      'enviada→anulada':             ['gerente', 'admin'],
      'observada→corregida':         ['gestor', 'coordinador', 'gerente', 'admin'],
      'observada→enviada':           ['gestor', 'coordinador', 'gerente', 'admin'],
      'observada→anulada':           ['gerente', 'admin'],
      'corregida→aprobada_cliente':  ['gestor', 'coordinador', 'gerente', 'admin'],
      'corregida→observada':         ['gestor', 'coordinador', 'gerente', 'admin'],
      'corregida→enviada':           ['gestor', 'coordinador', 'gerente', 'admin'],
      'corregida→anulada':           ['gerente', 'admin'],
      'aprobada_cliente→hes_pendiente': ['gestor', 'coordinador', 'gerente', 'administracion', 'admin'],
      'aprobada_cliente→enviada':    ['gerente', 'admin'],
      'aprobada_cliente→anulada':    ['gerente', 'admin'],
      'hes_pendiente→facturada':     ['gerente', 'administracion', 'admin'],
      'hes_pendiente→aprobada_cliente': ['gerente', 'administracion', 'admin'],
      'hes_pendiente→anulada':       ['gerente', 'admin'],
      'facturada→pagada':            ['gerente', 'administracion', 'admin'],
      'facturada→hes_pendiente':     ['gerente', 'administracion', 'admin'],
      'facturada→aprobada_cliente':  ['gerente', 'admin'],
      'facturada→anulada':           ['gerente', 'admin'],
      'pagada→facturada':            ['gerente', 'admin'],
      'pagada→anulada':              ['gerente', 'admin'],
    }

    if (body.estado && body.estado !== existing.estado) {
      const permitidas = TRANSICIONES[existing.estado] || []
      if (!permitidas.includes(body.estado)) {
        return NextResponse.json(
          { error: `Transición no permitida: ${existing.estado} → ${body.estado}` },
          { status: 400 }
        )
      }
      const claveRol = `${existing.estado}→${body.estado}`
      const rolesPermitidos = ROLES_TRANSICION[claveRol] || []
      if (!rolesPermitidos.includes(session.user.role)) {
        return NextResponse.json(
          { error: `Tu rol no puede realizar la transición ${existing.estado} → ${body.estado}` },
          { status: 403 }
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
        case 'hes_pendiente':
          if (!existing.fechaSolicitudHES) extraCampos = { fechaSolicitudHES: new Date() }
          break
      }
    }

    // Bloqueo: hes_pendiente → facturada requiere adjunto HES o Guía de Almacén
    if (body.estado === 'facturada' && existing.estado === 'hes_pendiente') {
      const adjuntoHES = await prisma.valorizacionAdjunto.findFirst({
        where: { valorizacionId: valId, categoria: { in: ['hes', 'guia_almacen'] } },
      })
      if (!adjuntoHES) {
        return NextResponse.json(
          { error: 'Se requiere adjuntar el documento HES o Guía de Almacén antes de facturar' },
          { status: 400 }
        )
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
      const estadosPostAprobacion = ['aprobada_cliente', 'hes_pendiente', 'facturada', 'pagada']
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

      // Revertir facturación (facturada → hes_pendiente): anular CxC asociadas
      if (existing.estado === 'facturada' && body.estado === 'hes_pendiente') {
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
              // Heredar conformidad del cliente (HES/Guía de Remisión) capturada en la valorización
              numeroHES: existing.numeroHES,
              numeroGuiaRemision: existing.numeroGuiaRemision,
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

    const acumuladoAnterior = await calcularAcumuladoAnterior(prisma, proyectoId, existing.numero)
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
    const ESTADOS_PAGO_BLOQUEADOS = ['aprobada_cliente', 'hes_pendiente', 'facturada', 'pagada', 'anulada']
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
        ...(body.tipoConformidad !== undefined && { tipoConformidad: body.tipoConformidad || null }),
        ...(body.numeroHES !== undefined && { numeroHES: body.numeroHES || null }),
        ...(body.numeroGuiaRemision !== undefined && { numeroGuiaRemision: body.numeroGuiaRemision || null }),
        ...(body.fechaConformidad !== undefined && { fechaConformidad: body.fechaConformidad ? new Date(body.fechaConformidad) : null }),
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

    // Cascada: si cambió el monto valorizado, los acumulados de las
    // valorizaciones POSTERIORES quedan desactualizados — recalcularlas.
    if (valorizacion.montoValorizacion !== existing.montoValorizacion) {
      await recalcularValorizacionesPosteriores(prisma, proyectoId, existing.numero)
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
