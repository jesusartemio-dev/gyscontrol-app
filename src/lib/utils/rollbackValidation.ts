import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════
// Helper centralizado: canRollback()
// Solo lectura — nunca escribe. Verifica si una entidad puede
// retroceder a un estado anterior de forma segura.
// ═══════════════════════════════════════════════════════════════

export type RollbackEntity = 'ordenCompra' | 'listaEquipo' | 'pedidoEquipo' | 'recepcionPendiente'

export interface RollbackBlocker {
  entity: string
  count: number
  message: string
}

export interface RollbackResult {
  allowed: boolean
  blockers: RollbackBlocker[]
  message: string
  fieldsToClean: string[]
}

// Transiciones válidas: [estadoActual] → [targetEstado]
const VALID_ROLLBACKS: Record<RollbackEntity, Record<string, string[]>> = {
  ordenCompra: {
    confirmada: ['enviada'],
    parcial: ['enviada'],
    enviada: ['aprobada'],
    aprobada: ['borrador'],
  },
  listaEquipo: {
    por_aprobar: ['por_validar'],
    por_validar: ['por_cotizar'],
  },
  pedidoEquipo: {
    enviado: ['borrador'],
    atendido: ['enviado'],
    parcial: ['atendido'],
    entregado: ['parcial'],
  },
  recepcionPendiente: {
    en_almacen: ['pendiente'],
    entregado_proyecto: ['en_almacen'],
  },
}

// ─── Dispatcher ─────────────────────────────────────────────

export async function canRollback(
  entity: RollbackEntity,
  id: string,
  targetEstado: string
): Promise<RollbackResult> {
  const checkers: Record<RollbackEntity, (id: string, target: string) => Promise<RollbackResult>> = {
    ordenCompra: checkOrdenCompraRollback,
    listaEquipo: checkListaEquipoRollback,
    pedidoEquipo: checkPedidoEquipoRollback,
    recepcionPendiente: checkRecepcionPendienteRollback,
  }

  const checker = checkers[entity]
  if (!checker) {
    return {
      allowed: false,
      blockers: [],
      message: `Entidad "${entity}" no soporta retroceso de estado.`,
      fieldsToClean: [],
    }
  }

  return checker(id, targetEstado)
}

// ─── Validar transición ─────────────────────────────────────

export function isValidRollback(
  entity: RollbackEntity,
  currentEstado: string,
  targetEstado: string
): boolean {
  const targets = VALID_ROLLBACKS[entity]?.[currentEstado]
  return targets?.includes(targetEstado) ?? false
}

// ─── Checkers individuales ──────────────────────────────────

async function checkOrdenCompraRollback(id: string, targetEstado: string): Promise<RollbackResult> {
  const oc = await prisma.ordenCompra.findUnique({
    where: { id },
    select: { estado: true, numero: true },
  })

  if (!oc) {
    return { allowed: false, blockers: [], message: 'Orden de compra no encontrada.', fieldsToClean: [] }
  }

  if (!isValidRollback('ordenCompra', oc.estado, targetEstado)) {
    return {
      allowed: false,
      blockers: [],
      message: `No se puede retroceder de "${oc.estado}" a "${targetEstado}".`,
      fieldsToClean: [],
    }
  }

  const blockers: RollbackBlocker[] = []

  if (oc.estado === 'aprobada' && targetEstado === 'borrador') {
    // Verificar recepciones activas
    const recepcionCount = await prisma.recepcionPendiente.count({
      where: {
        ordenCompraItem: { ordenCompraId: id },
        estado: { not: 'rechazado' },
      },
    })
    if (recepcionCount > 0) {
      blockers.push({
        entity: 'RecepcionPendiente',
        count: recepcionCount,
        message: `Tiene ${recepcionCount} recepción(es) pendiente(s) o en almacén`,
      })
    }
  }

  if (['confirmada', 'parcial'].includes(oc.estado) && targetEstado === 'enviada') {
    // Bloquear si hay recepciones activas (no rechazadas)
    const recepcionCount = await prisma.recepcionPendiente.count({
      where: {
        ordenCompraItem: { ordenCompraId: id },
        estado: { not: 'rechazado' },
      },
    })
    if (recepcionCount > 0) {
      blockers.push({
        entity: 'RecepcionPendiente',
        count: recepcionCount,
        message: `Tiene ${recepcionCount} recepción(es) activa(s) — elimínalas primero`,
      })
    }
  }

  // enviada → aprobada: siempre permitido (sin bloqueantes)

  const allowed = blockers.length === 0

  let fieldsToClean: string[]
  let message: string

  if (targetEstado === 'borrador') {
    fieldsToClean = ['fechaAprobacion', 'aprobadorId']
    message = allowed
      ? 'La OC volverá a Borrador. Podrás editar precios y cantidades.'
      : `No se puede retroceder:\n${blockers.map(b => `· ${b.message}`).join('\n')}`
  } else if (targetEstado === 'enviada') {
    fieldsToClean = ['fechaConfirmacion']
    message = allowed
      ? 'La OC volverá a Enviada. Se limpiará la fecha de confirmación.'
      : `No se puede retroceder:\n${blockers.map(b => `· ${b.message}`).join('\n')}`
  } else {
    fieldsToClean = ['fechaEnvio']
    message = allowed
      ? 'La OC volverá a Aprobada. Se limpiará la fecha de envío.'
      : `No se puede retroceder:\n${blockers.map(b => `· ${b.message}`).join('\n')}`
  }

  return { allowed, blockers, message, fieldsToClean }
}

async function checkListaEquipoRollback(id: string, targetEstado: string): Promise<RollbackResult> {
  const lista = await prisma.listaEquipo.findUnique({
    where: { id },
    select: { estado: true, codigo: true },
  })

  if (!lista) {
    return { allowed: false, blockers: [], message: 'Lista no encontrada.', fieldsToClean: [] }
  }

  if (!isValidRollback('listaEquipo', lista.estado, targetEstado)) {
    return {
      allowed: false,
      blockers: [],
      message: `No se puede retroceder de "${lista.estado}" a "${targetEstado}".`,
      fieldsToClean: [],
    }
  }

  const blockers: RollbackBlocker[] = []

  if (lista.estado === 'por_validar' && targetEstado === 'por_cotizar') {
    // Verificar si hay items con cotización seleccionada
    const seleccionados = await prisma.listaEquipoItem.count({
      where: {
        listaId: id,
        cotizacionSeleccionadaId: { not: null },
      },
    })
    if (seleccionados > 0) {
      blockers.push({
        entity: 'ListaEquipoItem',
        count: seleccionados,
        message: `${seleccionados} ítem(s) tienen cotización ganadora seleccionada — quita la selección primero`,
      })
    }
  }

  // por_aprobar → por_validar: siempre permitido

  const allowed = blockers.length === 0
  const fieldsToClean = targetEstado === 'por_cotizar'
    ? ['fechaFinCotizacion']
    : ['fechaValidacion'] // por_validar

  const message = allowed
    ? `La lista volverá a "${targetEstado.replace(/_/g, ' ')}".`
    : `No se puede retroceder:\n${blockers.map(b => `· ${b.message}`).join('\n')}`

  return { allowed, blockers, message, fieldsToClean }
}

async function checkPedidoEquipoRollback(id: string, targetEstado: string): Promise<RollbackResult> {
  const pedido = await prisma.pedidoEquipo.findUnique({
    where: { id },
    select: { estado: true, codigo: true },
  })

  if (!pedido) {
    return { allowed: false, blockers: [], message: 'Pedido no encontrado.', fieldsToClean: [] }
  }

  if (!isValidRollback('pedidoEquipo', pedido.estado, targetEstado)) {
    return {
      allowed: false,
      blockers: [],
      message: `No se puede retroceder de "${pedido.estado}" a "${targetEstado}".`,
      fieldsToClean: [],
    }
  }

  const blockers: RollbackBlocker[] = []

  // enviado → borrador / atendido → enviado: bloquear si tiene OCs activas
  if (['borrador', 'enviado'].includes(targetEstado)) {
    const ocCount = await prisma.ordenCompra.count({
      where: {
        pedidoEquipoId: id,
        estado: { not: 'cancelada' },
      },
    })
    if (ocCount > 0) {
      blockers.push({
        entity: 'OrdenCompra',
        count: ocCount,
        message: `Tiene ${ocCount} orden(es) de compra activa(s) — cancélalas primero`,
      })
    }
  }

  // parcial → atendido: bloquear si tiene recepciones que ya avanzaron
  if (targetEstado === 'atendido') {
    const recepcionCount = await prisma.recepcionPendiente.count({
      where: {
        pedidoEquipoItem: { pedidoId: id },
        estado: { in: ['en_almacen', 'entregado_proyecto'] },
      },
    })
    if (recepcionCount > 0) {
      blockers.push({
        entity: 'RecepcionPendiente',
        count: recepcionCount,
        message: `Tiene ${recepcionCount} recepción(es) en almacén o entregada(s) — retrocédelas primero`,
      })
    }
  }

  // entregado → parcial: bloquear si tiene entregas activas (con recepción vinculada)
  // EntregaItems huérfanos (recepcionPendienteId = null) no bloquean — se limpian al retroceder
  if (targetEstado === 'parcial') {
    const entregaCount = await prisma.entregaItem.count({
      where: {
        pedidoEquipoItem: { pedidoId: id },
        estado: 'entregado',
        recepcionPendienteId: { not: null },
      },
    })
    if (entregaCount > 0) {
      blockers.push({
        entity: 'EntregaItem',
        count: entregaCount,
        message: `Tiene ${entregaCount} entrega(s) activa(s) vinculada(s) a recepciones — retrocédelas primero`,
      })
    }
  }

  const allowed = blockers.length === 0
  const fieldsToClean: string[] = targetEstado === 'parcial' ? ['fechaEntregaReal'] : []

  const targetLabels: Record<string, string> = {
    borrador: 'Borrador',
    enviado: 'Enviado',
    atendido: 'Atendido',
    parcial: 'Parcial',
  }

  const message = allowed
    ? `El pedido volverá a ${targetLabels[targetEstado] || targetEstado}.`
    : `No se puede retroceder:\n${blockers.map(b => `· ${b.message}`).join('\n')}`

  return { allowed, blockers, message, fieldsToClean }
}

async function checkRecepcionPendienteRollback(id: string, targetEstado: string): Promise<RollbackResult> {
  const recepcion = await prisma.recepcionPendiente.findUnique({
    where: { id },
    select: { estado: true },
  })

  if (!recepcion) {
    return { allowed: false, blockers: [], message: 'Recepción no encontrada.', fieldsToClean: [] }
  }

  if (!isValidRollback('recepcionPendiente', recepcion.estado, targetEstado)) {
    return {
      allowed: false,
      blockers: [],
      message: `No se puede retroceder de "${recepcion.estado}" a "${targetEstado}".`,
      fieldsToClean: [],
    }
  }

  const blockers: RollbackBlocker[] = []

  if (recepcion.estado === 'en_almacen' && targetEstado === 'pendiente') {
    // Bloquear si ya tiene entregas al proyecto
    const entregaCount = await prisma.entregaItem.count({
      where: { recepcionPendienteId: id },
    })
    if (entregaCount > 0) {
      blockers.push({
        entity: 'EntregaItem',
        count: entregaCount,
        message: `Tiene ${entregaCount} entrega(s) al proyecto — retrocede la entrega primero`,
      })
    }
  }

  // entregado_proyecto → en_almacen: siempre permitido
  // (las EntregaItem se eliminan como parte del retroceso)

  const allowed = blockers.length === 0
  const fieldsToClean = targetEstado === 'pendiente'
    ? ['confirmadoPorId', 'fechaConfirmacion']
    : ['entregadoPorId', 'fechaEntregaProyecto']

  const message = allowed
    ? targetEstado === 'pendiente'
      ? 'La recepción volverá a Pendiente. Se limpiará la confirmación de almacén.'
      : 'La recepción volverá a Almacén. Se eliminarán las entregas al proyecto y se recalcularán cantidades.'
    : `No se puede retroceder:\n${blockers.map(b => `· ${b.message}`).join('\n')}`

  return { allowed, blockers, message, fieldsToClean }
}
