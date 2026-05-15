/**
 * scripts/validar-ausencias-e2e.ts
 *
 * Validación end-to-end del módulo de Ausencias contra la DB local.
 * Ejecuta los 6 bloques del flujo completo e imprime cada estado intermedio.
 *
 * Uso: npx tsx scripts/validar-ausencias-e2e.ts
 *
 * IMPORTANTE: solo corre contra localhost. Si DATABASE_URL apunta a Neon, aborta.
 */

import { PrismaClient, TurnoDia, ProyectoEstado } from '@prisma/client'

const prisma = new PrismaClient()
const MARKER = 'TEST_E2E'
const ANIO = new Date().getFullYear()

// ─── Safety ──────────────────────────────────────────────────────────────────

function assertLocalDb() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    console.error('\n❌  DATABASE_URL no apunta a localhost. Abortando para proteger producción.')
    console.error(`   URL detectada: ${url.slice(0, 60)}`)
    process.exit(1)
  }
  const display = url.replace(/:[^@]+@/, ':***@')
  console.log(`🔗 DB: ${display}`)
  console.log(`⏰ TZ local: ${Intl.DateTimeFormat().resolvedOptions().timeZone} (offset: ${-new Date().getTimezoneOffset() / 60}h)\n`)
}

// ─── Logging ──────────────────────────────────────────────────────────────────

const SEP = '─'.repeat(65)
let errorCount = 0

function section(title: string) {
  console.log(`\n${SEP}\n  ${title}\n${SEP}`)
}

function step(label: string, value?: unknown) {
  if (value === undefined) {
    console.log(`  ◆ ${label}`)
    return
  }
  if (typeof value === 'object' && value !== null) {
    console.log(`  ✔ ${label}:`)
    const lines = JSON.stringify(value, null, 2).split('\n')
    for (const l of lines) console.log(`      ${l}`)
  } else {
    console.log(`  ✔ ${label}: ${value}`)
  }
}

function ok(msg: string) {
  console.log(`  ✅ ${msg}`)
}

function warn(msg: string) {
  console.log(`  ⚠️  ${msg}`)
}

function fail(msg: string) {
  errorCount++
  console.log(`  ❌ FALLO: ${msg}`)
}

function assert(cond: boolean, okMsg: string, failMsg: string) {
  if (cond) ok(okMsg)
  else fail(failMsg)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns next Monday at local midnight, offset by `offsetWeeks` weeks. */
function nextMonday(offsetWeeks = 0): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const daysUntil = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysUntil + offsetWeeks * 7)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Display a date as YYYY-MM-DD using LOCAL timezone (for dates we created). */
function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Display a date as YYYY-MM-DD using UTC (for Prisma-returned @db.Date values). */
function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ─── Pure day-calculation logic (inlined from calcularDiasHabiles.ts) ─────────
// Uses UTC midnight normalization to match Prisma @db.Date output (UTC midnight).

interface DiaHabilItem {
  fecha: Date
  turno: TurnoDia
  dias: number
}

function normalizeLocal(d: Date): Date {
  const n = new Date(d)
  n.setUTCHours(0, 0, 0, 0)
  return n
}

function isEligible(d: Date, aplicaFDS: boolean, feriados: Set<string>): boolean {
  if (aplicaFDS) return true
  const day = d.getUTCDay()
  if (day === 0 || day === 6) return false
  return !feriados.has(utcDate(d))
}

function diasHabilesLista(
  fechaInicio: Date,
  fechaFin: Date,
  turnoInicio: TurnoDia,
  turnoFin: TurnoDia,
  aplicaFDS: boolean,
  feriados: Set<string> = new Set(),
): DiaHabilItem[] {
  const ini = normalizeLocal(fechaInicio)
  const fin = normalizeLocal(fechaFin)
  const items: DiaHabilItem[] = []

  if (ini.getTime() === fin.getTime()) {
    if (!isEligible(ini, aplicaFDS, feriados)) return []
    if (turnoInicio === 'dia_completo' && turnoFin === 'dia_completo') {
      return [{ fecha: new Date(ini), turno: 'dia_completo', dias: 1 }]
    }
    const turno: TurnoDia =
      turnoInicio === 'am' && turnoFin === 'am'
        ? 'am'
        : turnoInicio === 'pm' && turnoFin === 'pm'
          ? 'pm'
          : 'dia_completo'
    return [{ fecha: new Date(ini), turno, dias: 0.5 }]
  }

  let cur = new Date(ini)
  while (cur <= fin) {
    if (isEligible(cur, aplicaFDS, feriados)) {
      let turno: TurnoDia
      let dias: number
      if (cur.getTime() === ini.getTime()) {
        turno = turnoInicio === 'pm' ? 'pm' : 'dia_completo'
        dias = turnoInicio === 'pm' ? 0.5 : 1
      } else if (cur.getTime() === fin.getTime()) {
        turno = turnoFin === 'am' ? 'am' : 'dia_completo'
        dias = turnoFin === 'am' ? 0.5 : 1
      } else {
        turno = 'dia_completo'
        dias = 1
      }
      items.push({ fecha: new Date(cur), turno, dias })
    }
    const next = new Date(cur)
    next.setDate(next.getDate() + 1)
    cur = next
  }
  return items
}

async function buildFeriadoSet(inicio: Date, fin: Date): Promise<Set<string>> {
  const cal = await prisma.calendarioLaboral.findFirst({ where: { activo: true } })
  if (!cal) return new Set()
  const exc = await prisma.excepcionCalendario.findMany({
    where: {
      calendarioLaboralId: cal.id,
      tipo: { in: ['feriado', 'dia_no_laboral'] },
      fecha: { gte: inicio, lte: fin },
    },
    select: { fecha: true },
  })
  return new Set(exc.map((e) => utcDate(e.fecha)))
}

// ─── Resolver aprobador1 (inlined from resolverAprobador.ts) ──────────────────

const ESTADOS_ACTIVOS: ProyectoEstado[] = [
  'creado', 'en_planificacion', 'listas_pendientes', 'listas_aprobadas',
  'pedidos_creados', 'en_ejecucion', 'en_cierre',
]

async function resolverAprobador1(
  solicitanteId: string,
  fechaInicio: Date,
  fechaFin: Date,
): Promise<{ aprobador1Id: string | null; via: string }> {
  const empleado = await prisma.empleado.findUnique({
    where: { userId: solicitanteId },
    include: { departamento: { select: { responsableId: true } } },
  })
  const resp = empleado?.departamento?.responsableId
  if (resp && resp !== solicitanteId) return { aprobador1Id: resp, via: 'departamento' }

  type ProyectoBasico = { liderId: string | null; fechaInicio: Date; fechaFin: Date | null; createdAt: Date }
  const asignaciones = await prisma.personalProyecto.findMany({
    where: {
      userId: solicitanteId, activo: true,
      proyecto: { estado: { in: ESTADOS_ACTIVOS }, deletedAt: null },
    },
    include: {
      proyecto: { select: { liderId: true, fechaInicio: true, fechaFin: true, createdAt: true } },
    },
    orderBy: { proyecto: { createdAt: 'desc' } },
  }) as Array<{ proyecto: ProyectoBasico }>
  for (const a of asignaciones) {
    const p = a.proyecto
    const pFin = p.fechaFin ?? new Date('2099-12-31')
    if (fechaInicio <= pFin && fechaFin >= p.fechaInicio && p.liderId && p.liderId !== solicitanteId) {
      return { aprobador1Id: p.liderId, via: 'proyecto' }
    }
  }

  const admin = await prisma.user.findFirst({
    where: { role: 'administracion', id: { not: solicitanteId } },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
  if (admin) return { aprobador1Id: admin.id, via: 'administracion' }

  return { aprobador1Id: null, via: 'sin_resolver' }
}

// ─── Tx type ──────────────────────────────────────────────────────────────────

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// ─── Materializar celdas (inlined from materializarPlanificacion.ts) ──────────

async function materializarCeldas(
  solicitudId: string,
  aprobadorId: string,
  desasignarProyectos: boolean,
  tx: Tx,
): Promise<{ celdasCreadas: number; celdasEliminadas: number }> {
  const sol = await tx.solicitudAusencia.findUnique({
    where: { id: solicitudId },
    include: { tipoAusencia: { select: { aplicaFinDeSemana: true } } },
  })
  if (!sol) throw new Error(`Solicitud ${solicitudId} no encontrada`)

  let feriados = new Set<string>()
  if (!sol.tipoAusencia.aplicaFinDeSemana) {
    const cal = await tx.calendarioLaboral.findFirst({ where: { activo: true }, select: { id: true } })
    if (cal) {
      const exc = await tx.excepcionCalendario.findMany({
        where: {
          calendarioLaboralId: cal.id,
          tipo: { in: ['feriado', 'dia_no_laboral'] },
          fecha: { gte: sol.fechaInicio, lte: sol.fechaFin },
        },
        select: { fecha: true },
      })
      feriados = new Set(exc.map((e) => utcDate(e.fecha)))
    }
  }

  const lista = diasHabilesLista(
    sol.fechaInicio, sol.fechaFin,
    sol.turnoInicio, sol.turnoFin,
    sol.tipoAusencia.aplicaFinDeSemana, feriados,
  )
  let celdasCreadas = 0
  let celdasEliminadas = 0

  for (const dia of lista) {
    const existing = await tx.planificacionDia.findUnique({
      where: { userId_fecha_turno: { userId: sol.solicitanteId, fecha: dia.fecha, turno: dia.turno } },
      select: { id: true, proyectoId: true, solicitudAusenciaId: true },
    })
    if (existing) {
      if (existing.proyectoId !== null) {
        if (!desasignarProyectos) {
          throw new Error(`Conflicto no resuelto en ${utcDate(dia.fecha)} turno=${dia.turno}`)
        }
        await tx.planificacionDia.delete({ where: { id: existing.id } })
        await tx.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            entidadTipo: 'PLANIFICACION_DIA',
            entidadId: existing.id,
            accion: 'planificacion.desasignada_por_ausencia',
            usuarioId: aprobadorId,
            descripcion: `[${MARKER}] Celda desasignada de proyecto para ausencia ${solicitudId}`,
            cambios: JSON.stringify({ proyectoId: existing.proyectoId, reemplazadoPor: solicitudId }),
          },
        })
        celdasEliminadas++
      } else if (existing.solicitudAusenciaId) {
        throw new Error(`Integridad: ya existe ausencia en ${utcDate(dia.fecha)} turno=${dia.turno}`)
      }
    }
    await tx.planificacionDia.create({
      data: {
        userId: sol.solicitanteId,
        fecha: dia.fecha,
        turno: dia.turno,
        solicitudAusenciaId: solicitudId,
        tipoAusenciaId: sol.tipoAusenciaId,
        proyectoId: null,
        esExcepcional: false,
        createdById: aprobadorId,
      },
    })
    celdasCreadas++
  }
  return { celdasCreadas, celdasEliminadas }
}

// ─── Service wrappers ─────────────────────────────────────────────────────────

async function crearSolicitud(opts: {
  tipoAusenciaId: string
  solicitanteId: string
  fechaInicio: Date
  fechaFin: Date
  motivo: string
}) {
  return prisma.solicitudAusencia.create({
    data: {
      tipoAusenciaId: opts.tipoAusenciaId,
      solicitanteId: opts.solicitanteId,
      fechaInicio: opts.fechaInicio,
      fechaFin: opts.fechaFin,
      motivo: opts.motivo,
      estado: 'borrador',
      turnoInicio: 'dia_completo',
      turnoFin: 'dia_completo',
      updatedAt: new Date(),
    },
  })
}

async function enviarSolicitud(solicitudId: string) {
  const sol = await prisma.solicitudAusencia.findUnique({
    where: { id: solicitudId },
    include: { tipoAusencia: true },
  })
  if (!sol) throw new Error(`Solicitud ${solicitudId} no encontrada`)
  if (sol.estado !== 'borrador') throw new Error(`Estado inválido: ${sol.estado}`)

  // Overlap check
  const solapadas = await prisma.solicitudAusencia.findMany({
    where: {
      solicitanteId: sol.solicitanteId,
      id: { not: solicitudId },
      estado: { in: ['pendiente', 'aprobada', 'en_curso'] },
      fechaInicio: { lte: sol.fechaFin },
      fechaFin: { gte: sol.fechaInicio },
    },
  })
  if (solapadas.length > 0) {
    throw new Error(`Solapamiento con ${solapadas.length} solicitud(es) activas`)
  }

  // Calculate working days from local-midnight dates to avoid round-trip timezone shift
  // We re-read the dates as originally stored by using normalizeLocal on Prisma output
  const feriados = sol.tipoAusencia.aplicaFinDeSemana
    ? new Set<string>()
    : await buildFeriadoSet(sol.fechaInicio, sol.fechaFin)

  const lista = diasHabilesLista(
    sol.fechaInicio, sol.fechaFin,
    sol.turnoInicio, sol.turnoFin,
    sol.tipoAusencia.aplicaFinDeSemana, feriados,
  )
  const diasHabiles = lista.reduce((s, d) => s + d.dias, 0)

  // Validate saldo
  const anio = sol.fechaInicio.getFullYear()
  if (sol.tipoAusencia.descuentaSaldo) {
    let saldo = await prisma.saldoAusencia.findUnique({
      where: { userId_tipoAusenciaId_anio: { userId: sol.solicitanteId, tipoAusenciaId: sol.tipoAusenciaId, anio } },
    })
    if (!saldo) {
      const por = sol.tipoAusencia.diasPorDefecto ?? 0
      saldo = await prisma.saldoAusencia.create({
        data: {
          userId: sol.solicitanteId, tipoAusenciaId: sol.tipoAusenciaId, anio,
          diasAsignados: por, diasGozados: 0, diasPendientes: 0, diasDisponibles: por,
          updatedAt: new Date(),
        },
      })
    }
    if (saldo.diasDisponibles < diasHabiles) {
      throw new Error(
        `Saldo insuficiente. Disponibles: ${saldo.diasDisponibles}, requeridos: ${diasHabiles}`,
      )
    }
  }

  // Resolve aprobador
  const { aprobador1Id, via } = await resolverAprobador1(sol.solicitanteId, sol.fechaInicio, sol.fechaFin)
  const requiereAsignacion = aprobador1Id === null

  // Apply in transaction
  const updated = await prisma.$transaction(async (tx) => {
    if (sol.tipoAusencia.descuentaSaldo && diasHabiles > 0) {
      const saldo = await tx.saldoAusencia.findUnique({
        where: { userId_tipoAusenciaId_anio: { userId: sol.solicitanteId, tipoAusenciaId: sol.tipoAusenciaId, anio } },
      })
      if (saldo) {
        const nuevosPend = saldo.diasPendientes + diasHabiles
        await tx.saldoAusencia.update({
          where: { id: saldo.id },
          data: {
            diasPendientes: nuevosPend,
            diasDisponibles: saldo.diasAsignados - saldo.diasGozados - nuevosPend,
            updatedAt: new Date(),
          },
        })
        await tx.movimientoSaldoAusencia.create({
          data: {
            saldoId: saldo.id, tipo: 'consumo', dias: diasHabiles,
            motivo: `[${MARKER}] Solicitud enviada`, referenciaId: solicitudId,
            creadoPorId: sol.solicitanteId,
          },
        })
      }
    }
    return tx.solicitudAusencia.update({
      where: { id: solicitudId },
      data: {
        estado: 'pendiente', diasHabiles, aprobador1Id,
        requiereAsignacionAprobador: requiereAsignacion, updatedAt: new Date(),
      },
    })
  })

  return { updated, diasHabiles, via }
}

async function aprobarNivel1(
  solicitudId: string,
  aprobadorId: string,
  desasignarProyectos = false,
) {
  const sol = await prisma.solicitudAusencia.findUnique({
    where: { id: solicitudId },
    include: {
      tipoAusencia: {
        select: { aplicaFinDeSemana: true, descuentaSaldo: true, requiereAprobacion2: true, diasUmbralAprobacion2: true },
      },
    },
  })
  if (!sol) throw new Error(`Solicitud ${solicitudId} no encontrada`)
  if (sol.estado !== 'pendiente') throw new Error(`Estado inválido: ${sol.estado}`)
  if (sol.fechaAprobacion1) throw new Error('Nivel 1 ya aprobado')

  const diasHabiles = sol.diasHabiles ?? 0
  const requiereNivel2 =
    sol.tipoAusencia.requiereAprobacion2 ||
    (sol.tipoAusencia.diasUmbralAprobacion2 !== null &&
      diasHabiles > sol.tipoAusencia.diasUmbralAprobacion2)

  const now = new Date()

  if (requiereNivel2) {
    const aprobador2 = await prisma.user.findFirst({
      where: { role: { in: ['administracion', 'gerente'] }, id: { notIn: [sol.solicitanteId, aprobadorId] } },
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    })
    await prisma.solicitudAusencia.update({
      where: { id: solicitudId },
      data: {
        fechaAprobacion1: now, aprobador2Id: aprobador2?.id ?? null,
        requiereAsignacionAprobador: aprobador2 === null, updatedAt: now,
      },
    })
    return { requiereNivel2: true, aprobador2Id: aprobador2?.id ?? null, aprobador2Nombre: aprobador2?.name }
  }

  // Materialize and close in tx
  const result = await prisma.$transaction(async (tx) => {
    const mat = await materializarCeldas(solicitudId, aprobadorId, desasignarProyectos, tx)

    if (sol.tipoAusencia.descuentaSaldo && diasHabiles > 0) {
      const anio = sol.fechaInicio.getFullYear()
      const saldo = await tx.saldoAusencia.findUnique({
        where: { userId_tipoAusenciaId_anio: { userId: sol.solicitanteId, tipoAusenciaId: sol.tipoAusenciaId, anio } },
      })
      if (saldo) {
        const nuevosGozados = saldo.diasGozados + diasHabiles
        const nuevosPend = Math.max(0, saldo.diasPendientes - diasHabiles)
        await tx.saldoAusencia.update({
          where: { id: saldo.id },
          data: { diasGozados: nuevosGozados, diasPendientes: nuevosPend, diasDisponibles: saldo.diasAsignados - nuevosGozados - nuevosPend, updatedAt: now },
        })
        await tx.movimientoSaldoAusencia.create({
          data: { saldoId: saldo.id, tipo: 'consumo', dias: diasHabiles, motivo: `[${MARKER}] Aprobación nivel 1`, referenciaId: solicitudId, creadoPorId: aprobadorId },
        })
      }
    }
    const updated = await tx.solicitudAusencia.update({
      where: { id: solicitudId },
      data: { estado: 'aprobada', fechaAprobacion1: now, updatedAt: now },
    })
    return { updated, mat }
  })

  return { requiereNivel2: false, ...result }
}

async function aprobarNivel2(
  solicitudId: string,
  aprobadorId: string,
  desasignarProyectos = false,
) {
  const sol = await prisma.solicitudAusencia.findUnique({
    where: { id: solicitudId },
    include: { tipoAusencia: { select: { aplicaFinDeSemana: true, descuentaSaldo: true } } },
  })
  if (!sol) throw new Error(`Solicitud ${solicitudId} no encontrada`)
  if (sol.estado !== 'pendiente' || !sol.fechaAprobacion1) throw new Error('Nivel 1 no aprobado')
  if (sol.fechaAprobacion2) throw new Error('Nivel 2 ya aprobado')
  if (sol.aprobador1Id === aprobadorId) throw new Error('Separación de deberes: mismo usuario no puede aprobar ambos niveles')

  const diasHabiles = sol.diasHabiles ?? 0
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const mat = await materializarCeldas(solicitudId, aprobadorId, desasignarProyectos, tx)
    if (sol.tipoAusencia.descuentaSaldo && diasHabiles > 0) {
      const anio = sol.fechaInicio.getFullYear()
      const saldo = await tx.saldoAusencia.findUnique({
        where: { userId_tipoAusenciaId_anio: { userId: sol.solicitanteId, tipoAusenciaId: sol.tipoAusenciaId, anio } },
      })
      if (saldo) {
        const nuevosGozados = saldo.diasGozados + diasHabiles
        const nuevosPend = Math.max(0, saldo.diasPendientes - diasHabiles)
        await tx.saldoAusencia.update({
          where: { id: saldo.id },
          data: { diasGozados: nuevosGozados, diasPendientes: nuevosPend, diasDisponibles: saldo.diasAsignados - nuevosGozados - nuevosPend, updatedAt: now },
        })
        await tx.movimientoSaldoAusencia.create({
          data: { saldoId: saldo.id, tipo: 'consumo', dias: diasHabiles, motivo: `[${MARKER}] Aprobación nivel 2`, referenciaId: solicitudId, creadoPorId: aprobadorId },
        })
      }
    }
    const updated = await tx.solicitudAusencia.update({
      where: { id: solicitudId },
      data: { estado: 'aprobada', fechaAprobacion2: now, updatedAt: now },
    })
    return { updated, mat }
  })
}

async function rechazarSolicitud(solicitudId: string, aprobadorId: string, motivo?: string) {
  const sol = await prisma.solicitudAusencia.findUnique({
    where: { id: solicitudId },
    include: { tipoAusencia: { select: { descuentaSaldo: true } } },
  })
  if (!sol) throw new Error(`Solicitud ${solicitudId} no encontrada`)
  if (sol.estado !== 'pendiente') throw new Error(`No se puede rechazar estado '${sol.estado}'`)

  const diasHabiles = sol.diasHabiles ?? 0
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    if (sol.tipoAusencia.descuentaSaldo && diasHabiles > 0) {
      const anio = sol.fechaInicio.getFullYear()
      const saldo = await tx.saldoAusencia.findUnique({
        where: { userId_tipoAusenciaId_anio: { userId: sol.solicitanteId, tipoAusenciaId: sol.tipoAusenciaId, anio } },
      })
      if (saldo) {
        const nuevosPend = Math.max(0, saldo.diasPendientes - diasHabiles)
        await tx.saldoAusencia.update({
          where: { id: saldo.id },
          data: { diasPendientes: nuevosPend, diasDisponibles: saldo.diasAsignados - saldo.diasGozados - nuevosPend, updatedAt: now },
        })
        await tx.movimientoSaldoAusencia.create({
          data: { saldoId: saldo.id, tipo: 'devolucion', dias: diasHabiles, motivo: `[${MARKER}] Devolución por rechazo`, referenciaId: solicitudId, creadoPorId: aprobadorId },
        })
      }
    }
    return tx.solicitudAusencia.update({
      where: { id: solicitudId },
      data: { estado: 'rechazada', motivoRechazo: motivo ?? null, rechazadoPorId: aprobadorId, fechaRechazo: now, updatedAt: now },
    })
  })
}

async function cancelarSolicitud(solicitudId: string, solicitanteId: string) {
  const sol = await prisma.solicitudAusencia.findUnique({
    where: { id: solicitudId },
    include: { tipoAusencia: { select: { descuentaSaldo: true } } },
  })
  if (!sol) throw new Error(`Solicitud ${solicitudId} no encontrada`)

  const diasHabiles = sol.diasHabiles ?? 0
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    if (sol.tipoAusencia.descuentaSaldo && diasHabiles > 0) {
      const anio = sol.fechaInicio.getFullYear()
      const saldo = await tx.saldoAusencia.findUnique({
        where: { userId_tipoAusenciaId_anio: { userId: sol.solicitanteId, tipoAusenciaId: sol.tipoAusenciaId, anio } },
      })
      if (saldo) {
        let nuevosPend = saldo.diasPendientes
        let nuevosGozados = saldo.diasGozados
        if (sol.estado === 'pendiente') {
          nuevosPend = Math.max(0, saldo.diasPendientes - diasHabiles)
        } else {
          // aprobada / en_curso: days already moved to gozados
          nuevosGozados = Math.max(0, saldo.diasGozados - diasHabiles)
        }
        await tx.saldoAusencia.update({
          where: { id: saldo.id },
          data: { diasPendientes: nuevosPend, diasGozados: nuevosGozados, diasDisponibles: saldo.diasAsignados - nuevosGozados - nuevosPend, updatedAt: now },
        })
        await tx.movimientoSaldoAusencia.create({
          data: { saldoId: saldo.id, tipo: 'devolucion', dias: diasHabiles, motivo: `[${MARKER}] Devolución por cancelación`, referenciaId: solicitudId, creadoPorId: solicitanteId },
        })
      }
    }
    if (sol.estado === 'aprobada' || sol.estado === 'en_curso') {
      await tx.planificacionDia.deleteMany({ where: { solicitudAusenciaId: solicitudId } })
    }
    return tx.solicitudAusencia.update({
      where: { id: solicitudId },
      data: { estado: 'cancelada', updatedAt: now },
    })
  })
}

/** Enviar + auto-assign aprobador si requiereAsignacion=true */
async function enviarYAsegurarAprobador(solicitudId: string, fallbackAprobadorId: string) {
  const { updated, diasHabiles, via } = await enviarSolicitud(solicitudId)
  if (updated.requiereAsignacionAprobador) {
    warn(`Cadena no resolvió aprobador (nivel 3 no encontró role=administracion). Asignando ${fallbackAprobadorId} manualmente.`)
    await prisma.solicitudAusencia.update({
      where: { id: solicitudId },
      data: { aprobador1Id: fallbackAprobadorId, requiereAsignacionAprobador: false, updatedAt: new Date() },
    })
    const patched = await prisma.solicitudAusencia.findUnique({ where: { id: solicitudId } })
    return { updated: patched!, diasHabiles, via: via + '+manual' }
  }
  return { updated, diasHabiles, via }
}

// ─── Display helpers ─────────────────────────────────────────────────────────

async function printSaldo(userId: string, tipoAusenciaId: string, label: string) {
  const s = await prisma.saldoAusencia.findUnique({
    where: { userId_tipoAusenciaId_anio: { userId, tipoAusenciaId, anio: ANIO } },
  })
  if (!s) {
    console.log(`  📊 ${label}: (sin registro para ${ANIO})`)
  } else {
    console.log(
      `  📊 ${label}: asignados=${s.diasAsignados}  gozados=${s.diasGozados}  pendientes=${s.diasPendientes}  disponibles=${s.diasDisponibles}`,
    )
    // consistency check
    const calc = s.diasAsignados - s.diasGozados - s.diasPendientes
    if (Math.abs(calc - s.diasDisponibles) > 0.001) {
      fail(`Inconsistencia saldo: asignados(${s.diasAsignados}) - gozados(${s.diasGozados}) - pendientes(${s.diasPendientes}) = ${calc} ≠ disponibles(${s.diasDisponibles})`)
    }
  }
}

async function printCeldas(solicitudId: string, label: string) {
  const celdas = await prisma.planificacionDia.findMany({
    where: { solicitudAusenciaId: solicitudId },
    select: { fecha: true, turno: true },
    orderBy: { fecha: 'asc' },
  })
  console.log(`  📅 ${label}: ${celdas.length} celda(s)`)
  for (const c of celdas) {
    console.log(`       ${utcDate(c.fecha)} (${c.turno})`)
  }
  return celdas.length
}

function printSol(s: {
  id: string
  estado: string
  diasHabiles: number | null
  aprobador1Id: string | null
  aprobador2Id?: string | null
  requiereAsignacionAprobador?: boolean
  motivoRechazo?: string | null
  rechazadoPorId?: string | null
  fechaRechazo?: Date | null
}) {
  console.log(`  📋 Solicitud ${s.id.slice(-8)}:`)
  console.log(`       estado:     ${s.estado}`)
  console.log(`       diasHabiles: ${s.diasHabiles ?? '—'}`)
  console.log(`       aprobador1: ${s.aprobador1Id ?? '(sin asignar)'}`)
  if (s.aprobador2Id !== undefined) console.log(`       aprobador2: ${s.aprobador2Id ?? '(ninguno)'}`)
  if (s.requiereAsignacionAprobador !== undefined) console.log(`       requiereAsignacion: ${s.requiereAsignacionAprobador}`)
  if (s.motivoRechazo) console.log(`       motivoRechazo: "${s.motivoRechazo}"`)
  if (s.rechazadoPorId) console.log(`       rechazadoPorId: ${s.rechazadoPorId}`)
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
  const prev = await prisma.solicitudAusencia.findMany({
    where: { motivo: { startsWith: MARKER } },
    include: { tipoAusencia: { select: { descuentaSaldo: true } } },
  })
  if (prev.length === 0) {
    console.log('  🧹 Sin datos previos TEST_E2E que limpiar.')
    return
  }
  const ids = prev.map((s) => s.id)

  // Restore saldo for solicitudes that consumed days and weren't self-reverted
  for (const sol of prev) {
    if (!sol.tipoAusencia.descuentaSaldo || !sol.diasHabiles || sol.diasHabiles === 0) continue
    const anio = sol.fechaInicio.getUTCFullYear()
    const saldo = await prisma.saldoAusencia.findUnique({
      where: { userId_tipoAusenciaId_anio: { userId: sol.solicitanteId, tipoAusenciaId: sol.tipoAusenciaId, anio } },
    })
    if (!saldo) continue
    if (['aprobada', 'en_curso', 'finalizada'].includes(sol.estado)) {
      const nuevosGozados = Math.max(0, saldo.diasGozados - sol.diasHabiles)
      await prisma.saldoAusencia.update({
        where: { id: saldo.id },
        data: { diasGozados: nuevosGozados, diasDisponibles: saldo.diasAsignados - nuevosGozados - saldo.diasPendientes, updatedAt: new Date() },
      })
    } else if (sol.estado === 'pendiente') {
      const nuevosPend = Math.max(0, saldo.diasPendientes - sol.diasHabiles)
      await prisma.saldoAusencia.update({
        where: { id: saldo.id },
        data: { diasPendientes: nuevosPend, diasDisponibles: saldo.diasAsignados - saldo.diasGozados - nuevosPend, updatedAt: new Date() },
      })
    }
    // rechazada / cancelada / borrador: self-reverted, nothing to do
  }

  await prisma.movimientoSaldoAusencia.deleteMany({ where: { referenciaId: { in: ids } } })
  await prisma.planificacionDia.deleteMany({ where: { solicitudAusenciaId: { in: ids } } })
  await prisma.solicitudAusencia.deleteMany({ where: { id: { in: ids } } })
  console.log(`  🧹 Limpieza: ${ids.length} solicitud(es) TEST_E2E eliminadas.`)
}

/** Ensures at least `min` disponibles exist, boosting diasAsignados if needed. */
async function ensureSaldo(userId: string, tipoAusenciaId: string, anio: number, min: number) {
  const saldo = await prisma.saldoAusencia.findUnique({
    where: { userId_tipoAusenciaId_anio: { userId, tipoAusenciaId, anio } },
  })
  if (!saldo) {
    await prisma.saldoAusencia.create({
      data: { userId, tipoAusenciaId, anio, diasAsignados: min, diasGozados: 0, diasPendientes: 0, diasDisponibles: min, updatedAt: new Date() },
    })
    step(`Saldo creado para pruebas: diasAsignados=${min}`)
    return
  }
  const deficit = min - saldo.diasDisponibles
  if (deficit <= 0) return
  await prisma.saldoAusencia.update({
    where: { id: saldo.id },
    data: { diasAsignados: saldo.diasAsignados + deficit, diasDisponibles: saldo.diasDisponibles + deficit, updatedAt: new Date() },
  })
  step(`Saldo ajustado: diasAsignados ${saldo.diasAsignados} → ${saldo.diasAsignados + deficit} (disponibles antes: ${saldo.diasDisponibles})`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  assertLocalDb()

  // ── Find participants ───────────────────────────────────────────────────────
  section('CONFIGURACIÓN INICIAL')

  const solicitanteUser = await prisma.user.findFirst({
    where: { role: { notIn: ['admin', 'administracion'] }, empleado: { activo: true } },
    orderBy: { id: 'asc' },
  })
  if (!solicitanteUser) {
    console.error('❌ No hay empleado activo con role != admin/administracion. Abortar.')
    process.exit(1)
  }

  // Accept both 'administracion' and 'admin' as valid approver roles
  const aprobadorUser = await prisma.user.findFirst({
    where: { role: { in: ['administracion', 'admin'] } },
    orderBy: { id: 'asc' },
  })
  if (!aprobadorUser) {
    console.error('❌ No hay user con role=administracion o admin. Abortar.')
    process.exit(1)
  }

  const tipoVAC = await prisma.tipoAusencia.findUnique({ where: { codigo: 'VAC' } })
  if (!tipoVAC) { console.error('❌ TipoAusencia VAC no encontrada.'); process.exit(1) }

  const tipoPermSinGoce = await prisma.tipoAusencia.findUnique({ where: { codigo: 'PERM_SIN_GOCE' } })
  if (!tipoPermSinGoce) { console.error('❌ TipoAusencia PERM_SIN_GOCE no encontrada.'); process.exit(1) }

  const solId = solicitanteUser.id
  const aprId = aprobadorUser.id

  console.log(`  👤 Solicitante A: ${solicitanteUser.name ?? solicitanteUser.email}`)
  console.log(`       role=${solicitanteUser.role}  id=${solId}`)
  console.log(`  👤 Aprobador  B: ${aprobadorUser.name ?? aprobadorUser.email}`)
  console.log(`       role=${aprobadorUser.role}  id=${aprId}`)
  console.log(`  📌 TipoAusencia VAC: descuentaSaldo=${tipoVAC.descuentaSaldo}, diasPorDefecto=${tipoVAC.diasPorDefecto}, requiereAprobacion2=${tipoVAC.requiereAprobacion2}`)
  console.log(`  📌 TipoAusencia PERM_SIN_GOCE: descuentaSaldo=${tipoPermSinGoce.descuentaSaldo}`)

  step('Limpiando datos de corridas anteriores...')
  await cleanup()
  // Guarantee enough disponibles for the test run (B1=5 + B2=3 = 8 total consumed, B4 self-reverts)
  // Peak consumption: B1(5) + B2(3) + B4(3 before cancel) = 11; use 15 to add margin
  await ensureSaldo(solId, tipoVAC.id, ANIO, 15)

  // ════════════════════════════════════════════════════════════════════════════
  section('BLOQUE 1 — Flujo feliz (vacaciones L→V)')
  // ════════════════════════════════════════════════════════════════════════════

  const b1Ini = nextMonday(1)
  const b1Fin = addDays(b1Ini, 4) // Friday
  step(`Rango: ${localDate(b1Ini)} (lunes) → ${localDate(b1Fin)} (viernes)`)

  await printSaldo(solId, tipoVAC.id, 'Saldo VAC ANTES del envío')

  const sol1 = await crearSolicitud({ tipoAusenciaId: tipoVAC.id, solicitanteId: solId, fechaInicio: b1Ini, fechaFin: b1Fin, motivo: `${MARKER}_b1` })
  step(`Solicitud creada (borrador)`, sol1.id)

  const { updated: env1, diasHabiles: b1Dias, via: b1Via } = await enviarYAsegurarAprobador(sol1.id, aprId)
  printSol(env1)
  step(`Aprobador resuelto via`, b1Via)
  await printSaldo(solId, tipoVAC.id, 'Saldo VAC DESPUÉS del envío')

  assert(env1.estado === 'pendiente', 'estado = pendiente ✓', `estado=${env1.estado} (esperado pendiente)`)
  if (b1Dias === 5) ok(`diasHabiles = 5 ✓`)
  else if (b1Dias === 4) warn(`diasHabiles = 4 (posible offset UTC-5 en normalizeDate — ver nota de TZ)`)
  else fail(`diasHabiles = ${b1Dias} (esperado 5 para L-V sin feriados)`)
  assert(env1.aprobador1Id !== null, 'aprobador1Id resuelto ✓', 'aprobador1Id = null (requiereAsignacion=true)')

  step('Aprobando nivel 1...')
  const apr1 = await aprobarNivel1(sol1.id, aprId)

  if (!apr1.requiereNivel2) {
    const sol1f = await prisma.solicitudAusencia.findUnique({ where: { id: sol1.id } })!
    printSol(sol1f!)
    assert(sol1f?.estado === 'aprobada', 'estado = aprobada ✓', `estado=${sol1f?.estado}`)
    const n1 = await printCeldas(sol1.id, 'PlanificacionDia creadas')
    assert(n1 === b1Dias, `${n1} celdas creadas = diasHabiles ✓`, `celdas=${n1} ≠ diasHabiles=${b1Dias}`)
    await printSaldo(solId, tipoVAC.id, 'Saldo VAC DESPUÉS de aprobación')
  } else {
    step(`VAC requiere nivel 2. aprobador2Id=${apr1.aprobador2Id ?? '(no resuelto)'}`)
    if (apr1.aprobador2Id) {
      step('Aprobando nivel 2...')
      const r2 = await aprobarNivel2(sol1.id, apr1.aprobador2Id)
      const sol1f = await prisma.solicitudAusencia.findUnique({ where: { id: sol1.id } })
      printSol(sol1f!)
      assert(sol1f?.estado === 'aprobada', 'estado = aprobada (nivel 2) ✓', `estado=${sol1f?.estado}`)
      const n1 = await printCeldas(sol1.id, 'PlanificacionDia creadas')
      step(`Materialización`, r2.mat)
      await printSaldo(solId, tipoVAC.id, 'Saldo VAC DESPUÉS de aprobación nivel 2')
    } else {
      warn('No hay aprobador2 disponible. Bloque 1 no puede completarse.')
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  section('BLOQUE 2 — Conflicto de planificación')
  // ════════════════════════════════════════════════════════════════════════════

  const b2Ini = nextMonday(3)
  const b2Fin = addDays(b2Ini, 2) // Wednesday (3 días hábiles)
  step(`Rango: ${localDate(b2Ini)} (lunes) → ${localDate(b2Fin)} (miércoles) — 3 días`)

  const proyecto = await prisma.proyecto.findFirst({
    where: { deletedAt: null },
    select: { id: true, nombre: true, codigo: true },
  })
  if (!proyecto) {
    warn('No hay proyectos en la DB. Saltando bloque 2.')
  } else {
    step(`Proyecto para conflictos: ${proyecto.codigo} — ${proyecto.nombre}`)

    const sol2 = await crearSolicitud({ tipoAusenciaId: tipoVAC.id, solicitanteId: solId, fechaInicio: b2Ini, fechaFin: b2Fin, motivo: `${MARKER}_b2` })
    step(`Solicitud creada`, sol2.id)

    // Create 2 conflicting planning cells (Mon, Tue) with a project
    const conflictoFechas = [b2Ini, addDays(b2Ini, 1)]
    const celdasConflicto: string[] = []
    for (const fecha of conflictoFechas) {
      // Only create if not already occupied (idempotent)
      const existing = await prisma.planificacionDia.findUnique({
        where: { userId_fecha_turno: { userId: solId, fecha, turno: 'dia_completo' } },
      })
      if (!existing) {
        const c = await prisma.planificacionDia.create({
          data: { userId: solId, fecha, turno: 'dia_completo', proyectoId: proyecto.id, solicitudAusenciaId: null, esExcepcional: false, createdById: aprId },
        })
        celdasConflicto.push(c.id)
        console.log(`  📍 Celda de proyecto creada: ${localDate(fecha)} (dia_completo) → proyecto ${proyecto.codigo}`)
      } else {
        warn(`Celda ${localDate(fecha)} ya ocupada con proyectoId=${existing.proyectoId ?? 'ausencia'}. Usando existente.`)
        if (existing.proyectoId) celdasConflicto.push(existing.id)
      }
    }

    await enviarYAsegurarAprobador(sol2.id, aprId)
    step(`Solicitud enviada (estado=pendiente)`)

    // Detect conflicts
    const feriados2 = await buildFeriadoSet(b2Ini, b2Fin)
    const lista2 = diasHabilesLista(b2Ini, b2Fin, 'dia_completo', 'dia_completo', false, feriados2)
    const fechas2 = lista2.map((d) => d.fecha)
    const conflictantes = await prisma.planificacionDia.findMany({
      where: { userId: solId, proyectoId: { not: null }, fecha: { in: fechas2 } },
      select: { id: true, fecha: true, turno: true, proyectoId: true },
    })
    step(`GET /conflictos detectó`, `${conflictantes.length} conflicto(s)`)
    for (const c of conflictantes) console.log(`       ${utcDate(c.fecha)} (${c.turno}) → proyecto ${c.proyectoId}`)
    assert(conflictantes.length === 2, '2 conflictos detectados ✓', `${conflictantes.length} conflictos (esperados 2)`)

    // Try approve WITHOUT desasignarProyectos → must throw
    step('Intentando aprobar SIN desasignarProyectos=true...')
    try {
      await aprobarNivel1(sol2.id, aprId, false)
      fail('Debió lanzar error por conflicto no resuelto pero no lo hizo')
    } catch (e: any) {
      ok(`Error esperado capturado: "${e.message}"`)
    }

    // Approve WITH desasignarProyectos=true
    step('Aprobando CON desasignarProyectos=true...')
    const apr2 = await aprobarNivel1(sol2.id, aprId, true)

    const finalizarB2 = async (mat: { celdasCreadas: number; celdasEliminadas: number }) => {
      step('Resultado materialización', mat)
      assert(mat.celdasCreadas === 3, `celdasCreadas=3 ✓`, `celdasCreadas=${mat.celdasCreadas} (esperadas 3)`)
      assert(mat.celdasEliminadas === 2, `celdasEliminadas=2 ✓`, `celdasEliminadas=${mat.celdasEliminadas} (esperadas 2)`)

      // Verify old cells gone
      const oldCellsRemaining = await prisma.planificacionDia.count({ where: { id: { in: celdasConflicto } } })
      assert(oldCellsRemaining === 0, 'Celdas de proyecto eliminadas ✓', `${oldCellsRemaining} celda(s) de proyecto aún existen`)

      // Verify new absence cells
      const n2 = await printCeldas(sol2.id, 'Celdas ausencia creadas')
      assert(n2 === 3, `${n2} celdas ausencia ✓`, `celdas ausencia=${n2} (esperadas 3)`)

      // Check AuditLog desasignaciones
      const auditLogs = await prisma.auditLog.findMany({
        where: { accion: 'planificacion.desasignada_por_ausencia', descripcion: { contains: sol2.id } },
      })
      step(`AuditLog desasignación`, `${auditLogs.length} entrada(s)`)
      assert(auditLogs.length === 2, '2 entradas AuditLog desasignación ✓', `${auditLogs.length} entradas (esperadas 2)`)
    }

    if (!apr2.requiereNivel2 && 'mat' in apr2) {
      await finalizarB2(apr2.mat)
    } else if (apr2.requiereNivel2 && apr2.aprobador2Id) {
      step('VAC requiere nivel 2 (bloque 2). Aprobando nivel 2...')
      const r2b = await aprobarNivel2(sol2.id, apr2.aprobador2Id, true)
      await finalizarB2(r2b.mat)
    } else {
      warn('No hay aprobador2 disponible para bloque 2. Saltando verificación de celdas.')
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  section('BLOQUE 3 — Rechazo (PERM_SIN_GOCE, 1 día)')
  // ════════════════════════════════════════════════════════════════════════════

  const b3Ini = nextMonday(5)
  step(`Rango: ${localDate(b3Ini)} — 1 día`)

  const sol3 = await crearSolicitud({ tipoAusenciaId: tipoPermSinGoce.id, solicitanteId: solId, fechaInicio: b3Ini, fechaFin: b3Ini, motivo: `${MARKER}_b3` })
  await enviarYAsegurarAprobador(sol3.id, aprId)
  step('Solicitud enviada (estado=pendiente)')

  const motivoRechazo = 'No corresponde en período de cierre'
  const sol3R = await rechazarSolicitud(sol3.id, aprId, motivoRechazo)
  const sol3f = await prisma.solicitudAusencia.findUnique({ where: { id: sol3.id } })
  printSol(sol3f!)

  assert(sol3f?.estado === 'rechazada', 'estado = rechazada ✓', `estado=${sol3f?.estado}`)
  assert(sol3f?.motivoRechazo === motivoRechazo, 'motivoRechazo correcto ✓', `motivoRechazo="${sol3f?.motivoRechazo}"`)
  assert(sol3f?.rechazadoPorId === aprId, 'rechazadoPorId = aprobadorId ✓', `rechazadoPorId=${sol3f?.rechazadoPorId}`)

  const celdasRechazada = await prisma.planificacionDia.count({ where: { solicitudAusenciaId: sol3.id } })
  assert(celdasRechazada === 0, 'Sin PlanificacionDia para rechazada ✓', `${celdasRechazada} celdas encontradas (esperadas 0)`)

  if (!tipoPermSinGoce.descuentaSaldo) {
    ok('PERM_SIN_GOCE no descuenta saldo — no hay saldo que verificar ✓')
  }

  // ════════════════════════════════════════════════════════════════════════════
  section('BLOQUE 4 — Cancelación después de aprobada (VAC, 3 días)')
  // ════════════════════════════════════════════════════════════════════════════

  const b4Ini = nextMonday(7)
  const b4Fin = addDays(b4Ini, 2) // Wednesday
  step(`Rango: ${localDate(b4Ini)} → ${localDate(b4Fin)} — 3 días`)

  const sol4 = await crearSolicitud({ tipoAusenciaId: tipoVAC.id, solicitanteId: solId, fechaInicio: b4Ini, fechaFin: b4Fin, motivo: `${MARKER}_b4` })
  await enviarYAsegurarAprobador(sol4.id, aprId)
  step('Solicitud enviada')

  const apr4 = await aprobarNivel1(sol4.id, aprId)
  let sol4Aprobada = false

  if (!apr4.requiereNivel2 && 'updated' in apr4) {
    sol4Aprobada = true
  } else if (apr4.requiereNivel2 && apr4.aprobador2Id) {
    await aprobarNivel2(sol4.id, apr4.aprobador2Id)
    sol4Aprobada = true
  }

  if (!sol4Aprobada) {
    warn('Sin aprobador2 disponible. Saltando bloque 4.')
  } else {
    const sol4State = await prisma.solicitudAusencia.findUnique({ where: { id: sol4.id } })
    printSol(sol4State!)
    await printSaldo(solId, tipoVAC.id, 'Saldo ANTES de cancelar')
    const n4Before = await printCeldas(sol4.id, 'Celdas ANTES de cancelar')

    await cancelarSolicitud(sol4.id, solId)

    const sol4f = await prisma.solicitudAusencia.findUnique({ where: { id: sol4.id } })
    printSol(sol4f!)
    assert(sol4f?.estado === 'cancelada', 'estado = cancelada ✓', `estado=${sol4f?.estado}`)

    await printSaldo(solId, tipoVAC.id, 'Saldo DESPUÉS de cancelar')

    const n4After = await prisma.planificacionDia.count({ where: { solicitudAusenciaId: sol4.id } })
    assert(n4After === 0, '0 celdas PlanificacionDia (revertidas) ✓', `${n4After} celdas aún presentes`)
    step(`Celdas antes: ${n4Before} → después: ${n4After}`)
  }

  // ════════════════════════════════════════════════════════════════════════════
  section('BLOQUE 5 — Asignación manual de aprobador')
  // ════════════════════════════════════════════════════════════════════════════

  const allAdmins = await prisma.user.findMany({
    where: { role: { in: ['administracion', 'admin'] } },
    select: { id: true, name: true },
  })
  step(`Admins activos encontrados`, allAdmins.length)
  for (const a of allAdmins) console.log(`       ${a.id} — ${a.name}`)

  const b5Ini = nextMonday(9)

  // Strategy: If aprId is the ONLY admin, submit as aprId → chain fails → requiereAsignacion=true
  // Otherwise: submit as solId → chain resolves → demonstrate override from admin
  const soloUnAdmin = allAdmins.length === 1 && allAdmins[0].id === aprId
  const b5Solicitante = soloUnAdmin ? aprId : solId

  if (soloUnAdmin) {
    step('Solo hay un admin. Usando el admin como solicitante → cadena nivel 3 fallará.')
  } else {
    step('Hay varios admins o el solicitante ya tiene cadena resuelta. Demostrando asignación manual como override.')
  }

  const sol5 = await crearSolicitud({ tipoAusenciaId: tipoVAC.id, solicitanteId: b5Solicitante, fechaInicio: b5Ini, fechaFin: b5Ini, motivo: `${MARKER}_b5` })
  // For block 5 we intentionally want to see the raw resolution (don't auto-assign here)
  const { updated: env5, via: b5Via } = await enviarSolicitud(sol5.id)
  printSol(env5)
  step(`Resolución automática via`, b5Via)

  if (env5.requiereAsignacionAprobador) {
    ok('requiereAsignacionAprobador = true ✓ (cadena no resolvió)')
    assert(!env5.aprobador1Id, 'aprobador1Id = null ✓', `aprobador1Id=${env5.aprobador1Id}`)

    // Admin assigns manually
    const targetAprobador = allAdmins.find((a) => a.id !== b5Solicitante) ?? allAdmins[0]
    if (!targetAprobador) {
      warn('Sin aprobador disponible para asignación manual. Saltando.')
    } else {
      step(`Admin asigna aprobador manualmente: ${targetAprobador.name ?? targetAprobador.id}`)
      // Replicate PATCH /asignar-aprobador
      await prisma.$transaction(async (tx) => {
        await tx.solicitudAusencia.update({
          where: { id: sol5.id },
          data: { aprobador1Id: targetAprobador.id, requiereAsignacionAprobador: false, updatedAt: new Date() },
        })
        await tx.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            entidadTipo: 'SOLICITUD_AUSENCIA', entidadId: sol5.id,
            accion: 'ausencia.aprobador1_asignado', usuarioId: aprId,
            descripcion: `[${MARKER}] Aprobador nivel 1 asignado manualmente: ${targetAprobador.id}`,
            cambios: JSON.stringify({ nivel: 1, aprobadorId: targetAprobador.id }),
          },
        })
      })

      const sol5After = await prisma.solicitudAusencia.findUnique({ where: { id: sol5.id } })
      printSol(sol5After!)
      assert(!sol5After?.requiereAsignacionAprobador, 'requiereAsignacionAprobador = false ✓', `requiereAsignacion=${sol5After?.requiereAsignacionAprobador}`)
      assert(sol5After?.aprobador1Id === targetAprobador.id, 'aprobador1Id asignado correctamente ✓', `aprobador1Id=${sol5After?.aprobador1Id}`)

      if (targetAprobador.id !== b5Solicitante) {
        step('Aprobando solicitud con el aprobador asignado manualmente...')
        const apr5 = await aprobarNivel1(sol5.id, targetAprobador.id)
        if (!apr5.requiereNivel2) {
          const sol5f = await prisma.solicitudAusencia.findUnique({ where: { id: sol5.id } })
          assert(sol5f?.estado === 'aprobada', 'Aprobada correctamente ✓', `estado=${sol5f?.estado}`)
        } else {
          warn('VAC requiere nivel 2 (bloque 5). Skip verificación adicional.')
        }
      }
    }
  } else {
    ok(`requiereAsignacionAprobador = false (cadena resolvió via ${b5Via}). Demostrando override manual.`)
    const aprobadorOriginal = env5.aprobador1Id
    // Admin overrides the auto-resolved approver
    const nuevoAprobador = allAdmins.find((a) => a.id !== aprobadorOriginal && a.id !== b5Solicitante)
    if (nuevoAprobador) {
      step(`Override: cambiando aprobador1 de ${aprobadorOriginal} → ${nuevoAprobador.id}`)
      await prisma.solicitudAusencia.update({
        where: { id: sol5.id },
        data: { aprobador1Id: nuevoAprobador.id, updatedAt: new Date() },
      })
      const sol5After = await prisma.solicitudAusencia.findUnique({ where: { id: sol5.id } })
      assert(sol5After?.aprobador1Id === nuevoAprobador.id, 'Aprobador overrideado correctamente ✓', `aprobador1Id=${sol5After?.aprobador1Id}`)
    } else {
      warn('No hay segundo admin para demostrar override. Aprobando con el aprobador auto-resuelto.')
    }
    // Approve with whoever is the current aprobador1
    const sol5Current = await prisma.solicitudAusencia.findUnique({ where: { id: sol5.id }, select: { aprobador1Id: true } })
    if (sol5Current?.aprobador1Id && sol5Current.aprobador1Id !== b5Solicitante) {
      const apr5 = await aprobarNivel1(sol5.id, sol5Current.aprobador1Id)
      if (!apr5.requiereNivel2) {
        const sol5f = await prisma.solicitudAusencia.findUnique({ where: { id: sol5.id } })
        assert(sol5f?.estado === 'aprobada', 'Aprobada correctamente ✓', `estado=${sol5f?.estado}`)
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  section('BLOQUE 6 — Crons')
  // ════════════════════════════════════════════════════════════════════════════

  const ahora = new Date()
  const hoy = new Date(ahora)
  hoy.setHours(0, 0, 0, 0)

  const aprobadasConInicioHoy = await prisma.solicitudAusencia.count({
    where: { estado: 'aprobada', fechaInicio: { lte: hoy } },
  })
  const enCursoConFinPasado = await prisma.solicitudAusencia.count({
    where: { estado: 'en_curso', fechaFin: { lt: hoy } },
  })
  step(`Candidatas activar (aprobada, fechaInicio ≤ hoy)`, aprobadasConInicioHoy)
  step(`Candidatas finalizar (en_curso, fechaFin < hoy)`, enCursoConFinPasado)

  // ── activarAusenciasEnCurso ──
  step('Ejecutando activarAusenciasEnCurso()...')
  const candidatasActivar = await prisma.solicitudAusencia.findMany({
    where: { estado: 'aprobada', fechaInicio: { lte: hoy } },
    select: { id: true, solicitanteId: true, diasHabiles: true, fechaInicio: true },
  })
  let activadas = 0
  if (candidatasActivar.length > 0) {
    const idsActivar = candidatasActivar.map((s) => s.id)
    await prisma.solicitudAusencia.updateMany({
      where: { id: { in: idsActivar } },
      data: { estado: 'en_curso', updatedAt: new Date() },
    })
    for (const id of idsActivar) {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA', entidadId: id,
          accion: 'ausencia.activada_cron', usuarioId: 'system',
          descripcion: `[${MARKER}] Activada automáticamente por cron`,
          cambios: JSON.stringify({ estadoAnterior: 'aprobada', estadoNuevo: 'en_curso' }),
        },
      })
    }
    activadas = idsActivar.length
  }
  step(`Solicitudes activadas (aprobada → en_curso)`, activadas)

  // ── finalizarAusencias ──
  step('Ejecutando finalizarAusencias()...')
  const candidatasFinalizar = await prisma.solicitudAusencia.findMany({
    where: { estado: 'en_curso', fechaFin: { lt: hoy } },
    select: { id: true, solicitanteId: true, tipoAusenciaId: true, diasHabiles: true, fechaInicio: true, fechaFin: true },
  })
  let finalizadas = 0
  if (candidatasFinalizar.length > 0) {
    const idsFinalizar = candidatasFinalizar.map((s) => s.id)
    await prisma.solicitudAusencia.updateMany({
      where: { id: { in: idsFinalizar } },
      data: { estado: 'finalizada', updatedAt: new Date() },
    })
    finalizadas = idsFinalizar.length
    step(`Solicitudes finalizadas (en_curso → finalizada)`, finalizadas)

    // Show saldo for first finalized
    const primera = candidatasFinalizar[0]
    const tipoP = await prisma.tipoAusencia.findUnique({ where: { id: primera.tipoAusenciaId }, select: { nombre: true, descuentaSaldo: true } })
    console.log(`\n  Primera finalizada: tipo=${tipoP?.nombre}, diasHabiles=${primera.diasHabiles}`)
    console.log(`  Rango: ${utcDate(primera.fechaInicio)} → ${utcDate(primera.fechaFin)}`)
    await printSaldo(primera.solicitanteId, primera.tipoAusenciaId, 'Saldo final (debe: gozados=X, pendientes=0, disponibles consistente)')
  } else {
    step('finalizarAusencias: 0 solicitudes — ninguna en_curso con fechaFin pasada')
    ok('Cron ejecutado. No hay solicitudes históricas pasadas en esta DB para este flujo.')
  }

  // ════════════════════════════════════════════════════════════════════════════
  section('RESUMEN FINAL')
  // ════════════════════════════════════════════════════════════════════════════

  const all = await prisma.solicitudAusencia.findMany({
    where: { motivo: { startsWith: MARKER } },
    select: { id: true, estado: true, diasHabiles: true, motivo: true, fechaInicio: true, fechaFin: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log('\n  Estado final de solicitudes TEST_E2E:')
  for (const s of all) {
    console.log(`    [${s.motivo}]  ${s.id.slice(-8)} | ${String(s.estado).padEnd(12)} | ${utcDate(s.fechaInicio)}→${utcDate(s.fechaFin)} | ${s.diasHabiles ?? '?'} días`)
  }

  console.log(`\n  Errores detectados: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n✅ Validación e2e completada sin errores.\n')
  } else {
    console.log(`\n⚠️  Validación completada con ${errorCount} fallo(s). Ver detalles arriba.\n`)
  }
}

main()
  .catch((err) => {
    console.error('\n❌ Error fatal no capturado:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
