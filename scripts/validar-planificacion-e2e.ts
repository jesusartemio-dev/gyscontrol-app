/**
 * scripts/validar-planificacion-e2e.ts
 *
 * Validación end-to-end del backend de Planificación de Personal contra DB local.
 * Sigue el patrón de validar-ausencias-e2e.ts: usa Prisma directamente.
 * La lógica de copiarSemana se inlinea (misma implementación que el servicio).
 *
 * Uso: npx tsx scripts/validar-planificacion-e2e.ts
 *
 * IMPORTANTE: Solo corre contra localhost. Si DATABASE_URL apunta a Neon, aborta.
 */

import { PrismaClient } from '@prisma/client'

// ── Pure utils (inlined from src/lib/utils/planificacion.ts) ──────────────────

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86400000)
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dateToISOWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function parseISOWeek(isoWeek: string): Date {
  const match = isoWeek.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) throw new Error(`Formato de semana inválido: ${isoWeek}`)
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
  return new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000)
}

// ── Validation service (inlined from src/services/planificacion/validarAsignacion.ts) ──

type TurnoDia = 'dia_completo' | 'am' | 'pm'
type PrismaTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

interface ValidacionError { codigo: string; mensaje: string; detalle?: unknown }
interface ValidacionWarning { codigo: string; mensaje: string }
interface ValidacionResult { valido: boolean; errores: ValidacionError[]; warnings: ValidacionWarning[] }

const ESTADOS_INACTIVOS = ['cerrado', 'pausado', 'cancelado']

function turnosConflicto(turno: TurnoDia): TurnoDia[] {
  if (turno === 'dia_completo') return ['dia_completo', 'am', 'pm']
  return ['dia_completo', turno]
}

async function validarAsignacion(
  userId: string,
  fecha: Date,
  turno: TurnoDia,
  proyectoId: string,
  esExcepcional: boolean,
  tx: PrismaTx,
): Promise<ValidacionResult> {
  const errores: ValidacionError[] = []
  const warnings: ValidacionWarning[] = []

  const empleado = await tx.empleado.findUnique({ where: { userId }, select: { activo: true } })
  if (!empleado || !empleado.activo) {
    return { valido: false, errores: [{ codigo: 'empleado_no_activo', mensaje: 'El usuario no tiene un empleado activo' }], warnings }
  }

  const proyecto = await tx.proyecto.findUnique({
    where: { id: proyectoId },
    select: { estado: true, fechaInicio: true, fechaFin: true },
  })
  if (!proyecto || ESTADOS_INACTIVOS.includes(proyecto.estado)) {
    return { valido: false, errores: [{ codigo: 'proyecto_no_activo', mensaje: 'El proyecto no existe o no está activo' }], warnings }
  }

  const fechaMs = fecha.getTime()
  if (fechaMs < proyecto.fechaInicio.getTime()) {
    errores.push({ codigo: 'fecha_fuera_de_rango_proyecto', mensaje: `La fecha es anterior al inicio del proyecto (${toDateKey(proyecto.fechaInicio)})` })
  } else if (proyecto.fechaFin && fechaMs > proyecto.fechaFin.getTime()) {
    errores.push({ codigo: 'fecha_fuera_de_rango_proyecto', mensaje: `La fecha es posterior al fin del proyecto (${toDateKey(proyecto.fechaFin)})` })
  }

  if (errores.length === 0) {
    const ausenciaCell = await tx.planificacionDia.findFirst({
      where: { userId, fecha, solicitudAusenciaId: { not: null }, turno: { in: turnosConflicto(turno) } },
      include: { solicitudAusencia: { select: { id: true, estado: true, tipoAusencia: { select: { nombre: true } } } } },
    })
    if (ausenciaCell) {
      errores.push({
        codigo: 'conflicto_ausencia',
        mensaje: 'El usuario tiene una ausencia aprobada que cubre esta fecha y turno',
        detalle: {
          solicitudAusenciaId: ausenciaCell.solicitudAusenciaId,
          tipo: ausenciaCell.solicitudAusencia?.tipoAusencia?.nombre,
          estado: ausenciaCell.solicitudAusencia?.estado,
        },
      })
    }
  }

  const dia = fecha.getUTCDay()
  if ((dia === 0 || dia === 6) && !esExcepcional) {
    errores.push({ codigo: 'fin_de_semana_no_excepcional', mensaje: 'La fecha es fin de semana. Marque esExcepcional=true para confirmar.' })
  }

  const enProyecto = await tx.personalProyecto.findFirst({ where: { userId, proyectoId, activo: true }, select: { id: true } })
  if (!enProyecto) {
    warnings.push({ codigo: 'persona_no_en_proyecto', mensaje: 'La persona no está asignada oficialmente a este proyecto' })
  }

  return { valido: errores.length === 0, errores, warnings }
}

// ── copiarSemana (inlined from src/services/planificacion/copiarSemana.ts) ─────

interface CopiarSemanaResult {
  celdasCreadas: number
  celdasOmitidas: number
  razonesOmision: { ausencia_destino: number; proyecto_inactivo: number; celda_ya_existe: number; celda_excepcional: number }
}

async function copiarSemana(
  prisma: PrismaClient,
  semanaOrigen: string,
  semanaDestino: string,
  departamentoId: string | undefined,
  adminId: string,
): Promise<CopiarSemanaResult> {
  const monOrigen = parseISOWeek(semanaOrigen)
  const monDestino = parseISOWeek(semanaDestino)
  const razonesOmision = { ausencia_destino: 0, proyecto_inactivo: 0, celda_ya_existe: 0, celda_excepcional: 0 }

  return prisma.$transaction(async (tx) => {
    const diasOrigen = Array.from({ length: 7 }, (_, i) => addDays(monOrigen, i))

    let userIds: string[] | undefined
    if (departamentoId) {
      const empleados = await tx.empleado.findMany({
        where: { departamentoId, activo: true },
        select: { userId: true },
      })
      userIds = empleados.map((e) => e.userId)
      if (userIds.length === 0) return { celdasCreadas: 0, celdasOmitidas: 0, razonesOmision }
    }

    const todasCeldas = await tx.planificacionDia.findMany({
      where: {
        fecha: { gte: diasOrigen[0], lte: diasOrigen[6] },
        proyectoId: { not: null },
        solicitudAusenciaId: null,
        ...(userIds ? { userId: { in: userIds } } : {}),
      },
    })

    const celdasOrigen = todasCeldas.filter((c) => !c.esExcepcional)
    razonesOmision.celda_excepcional = todasCeldas.length - celdasOrigen.length

    let celdasCreadas = 0
    let celdasOmitidas = razonesOmision.celda_excepcional

    for (const celda of celdasOrigen) {
      const diasOffset = Math.round((celda.fecha.getTime() - monOrigen.getTime()) / 86400000)
      const fechaDestino = addDays(monDestino, diasOffset)

      const existe = await tx.planificacionDia.findFirst({
        where: { userId: celda.userId, fecha: fechaDestino, turno: celda.turno },
        select: { id: true },
      })
      if (existe) {
        razonesOmision.celda_ya_existe++
        celdasOmitidas++
        continue
      }

      const validacion = await validarAsignacion(
        celda.userId,
        fechaDestino,
        celda.turno as TurnoDia,
        celda.proyectoId!,
        celda.esExcepcional,
        tx as unknown as PrismaTx,
      )

      if (!validacion.valido) {
        const codigos = validacion.errores.map((e) => e.codigo)
        if (codigos.includes('conflicto_ausencia')) razonesOmision.ausencia_destino++
        else if (codigos.includes('proyecto_no_activo') || codigos.includes('fecha_fuera_de_rango_proyecto')) razonesOmision.proyecto_inactivo++
        celdasOmitidas++
        continue
      }

      await tx.planificacionDia.create({
        data: {
          userId: celda.userId,
          fecha: fechaDestino,
          turno: celda.turno,
          proyectoId: celda.proyectoId,
          esExcepcional: celda.esExcepcional,
          notas: celda.notas,
          createdById: adminId,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'PLANIFICACION_DIA',
          entidadId: celda.userId,
          accion: 'planificacion.celda_copiada',
          usuarioId: adminId,
          descripcion: `[E2E_PLAN] Celda copiada de ${semanaOrigen} a ${semanaDestino}`,
          cambios: JSON.stringify({ origenCeldaId: celda.id, fecha: toDateKey(fechaDestino) }),
        },
      })

      celdasCreadas++
    }

    return { celdasCreadas, celdasOmitidas, razonesOmision }
  })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient()
const MARKER = 'E2E_PLAN'

function assertLocalDb() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    console.error('\n❌  DATABASE_URL no apunta a localhost. Abortando para proteger producción.')
    console.error(`   URL detectada: ${url.slice(0, 60)}`)
    process.exit(1)
  }
  const display = url.replace(/:[^@]+@/, ':***@')
  console.log(`🔗 DB: ${display}`)
}

// ── Logging ───────────────────────────────────────────────────────────────────

const SEP = '─'.repeat(65)
let errorCount = 0

function section(title: string) { console.log(`\n${SEP}\n  ${title}\n${SEP}`) }
function ok(msg: string) { console.log(`  ✅ ${msg}`) }
function warn(msg: string) { console.log(`  ⚠️  ${msg}`) }
function fail(msg: string) { errorCount++; console.log(`  ❌ FALLO: ${msg}`) }
function assert(cond: boolean, okMsg: string, failMsg: string) { if (cond) ok(okMsg); else fail(failMsg) }
function step(label: string, value?: unknown) {
  if (value === undefined) { console.log(`  ◆ ${label}`); return }
  if (typeof value === 'object' && value !== null) {
    console.log(`  ✔ ${label}:`)
    JSON.stringify(value, null, 2).split('\n').forEach((l) => console.log(`      ${l}`))
  } else {
    console.log(`  ✔ ${label}: ${value}`)
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup() {
  // Remove planificacion cells created by test (tagged with notas=MARKER)
  const delCeldas = await prisma.planificacionDia.deleteMany({ where: { notas: MARKER } })

  // Remove absence solicitudes created by test + their planificacion cells
  const prevSols = await prisma.solicitudAusencia.findMany({
    where: { motivo: { startsWith: MARKER } },
    select: { id: true },
  })
  if (prevSols.length > 0) {
    const ids = prevSols.map((s) => s.id)
    await prisma.planificacionDia.deleteMany({ where: { solicitudAusenciaId: { in: ids } } })
    await prisma.solicitudAusencia.deleteMany({ where: { id: { in: ids } } })
  }

  console.log(`  🧹 Limpieza: ${delCeldas.count} celda(s) + ${prevSols.length} solicitud(es) eliminadas`)
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  assertLocalDb()

  // ── Configuración inicial ─────────────────────────────────────────────────
  section('CONFIGURACIÓN INICIAL')

  // Find dept with active empleados
  const dept = await prisma.departamento.findFirst({
    where: {
      activo: true,
      empleados: { some: { activo: true } },
    },
    select: { id: true, nombre: true },
  })
  if (!dept) { console.error('❌ No hay departamentos activos con empleados'); process.exit(1) }

  // Find 2 distinct active empleados in that dept
  const empleados = await prisma.empleado.findMany({
    where: { activo: true, departamentoId: dept.id },
    include: { user: { select: { id: true, name: true, role: true } } },
    take: 2,
    orderBy: { userId: 'asc' },
  })
  if (empleados.length < 2) {
    console.error(`❌ Se necesitan ≥2 empleados activos en dept "${dept.nombre}" (encontrados: ${empleados.length})`)
    process.exit(1)
  }
  const empA = empleados[0]
  const empB = empleados[1]

  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['admin', 'administracion'] } },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  })
  if (!adminUser) { console.error('❌ No hay usuario admin'); process.exit(1) }

  // Find an active project whose fechaInicio ≤ next Monday
  const nextMonday = (() => {
    const now = new Date()
    const utcDay = now.getUTCDay()
    const daysUntil = utcDay === 0 ? 1 : 8 - utcDay
    const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + daysUntil * 86400000
    return new Date(ms)
  })()

  const proyecto = await prisma.proyecto.findFirst({
    where: {
      estado: { notIn: ['cerrado', 'pausado', 'cancelado'] },
      deletedAt: null,
      fechaInicio: { lte: nextMonday },
    },
    select: { id: true, codigo: true, nombre: true, estado: true, fechaInicio: true, fechaFin: true },
    orderBy: { fechaInicio: 'desc' },
  })
  if (!proyecto) { console.error('❌ No hay proyectos activos cuyo fechaInicio ≤ próximo lunes'); process.exit(1) }

  const tipoAusencia = await prisma.tipoAusencia.findFirst({
    where: { activo: true, requiereDocumento: false, descuentaSaldo: false },
    select: { id: true, codigo: true, nombre: true, aplicaFinDeSemana: true },
  })
  if (!tipoAusencia) { console.error('❌ No hay tipo de ausencia sin documento ni descuento de saldo'); process.exit(1) }

  console.log(`  👤 Empleado A : ${empA.user.name ?? empA.userId} (role=${empA.user.role})`)
  console.log(`  👤 Empleado B : ${empB.user.name ?? empB.userId} (role=${empB.user.role})`)
  console.log(`  👤 Admin      : ${adminUser.name ?? adminUser.id}`)
  console.log(`  🏗 Proyecto X : [${proyecto.codigo}] ${proyecto.nombre} (${proyecto.estado})`)
  console.log(`                  fechaInicio=${toDateKey(proyecto.fechaInicio)}${proyecto.fechaFin ? '  fechaFin=' + toDateKey(proyecto.fechaFin) : '  (sin fechaFin)'}`)
  console.log(`  🏢 Departamento: ${dept.nombre} (id=${dept.id})`)
  console.log(`  📋 TipoAusencia: ${tipoAusencia.codigo} — ${tipoAusencia.nombre}`)

  step('Limpiando datos previos de pruebas...')
  await cleanup()

  // ── Date setup ──────────────────────────────────────────────────────────
  const lunes = nextMonday
  const martes = addDays(lunes, 1)
  const miercoles = addDays(lunes, 2)
  const sabado = addDays(lunes, 5)
  const domingo = addDays(lunes, 6)
  const luneSiguiente = addDays(lunes, 7)

  const semanaActual = dateToISOWeek(lunes)
  const semanaSiguiente = dateToISOWeek(luneSiguiente)

  console.log(`\n  📅 Semana actual   : ${semanaActual}`)
  console.log(`  📅 Fechas de prueba: L=${toDateKey(lunes)}  M=${toDateKey(martes)}  X=${toDateKey(miercoles)}  S=${toDateKey(sabado)}`)
  console.log(`  📅 Semana siguiente: ${semanaSiguiente}  (lunes=${toDateKey(luneSiguiente)})`)

  // ══════════════════════════════════════════════════════════════════════════
  section('BLOQUE 1 — Asignar y consultar')
  // ══════════════════════════════════════════════════════════════════════════

  async function crearCelda(userId: string, fecha: Date, turno: TurnoDia, esExcepcional = false) {
    const v = await validarAsignacion(userId, fecha, turno, proyecto.id, esExcepcional, prisma as unknown as PrismaTx)
    if (!v.valido) {
      fail(`Validación falló inesperadamente para ${userId.slice(-6)}, ${toDateKey(fecha)}: ${v.errores.map((e) => e.codigo).join(', ')}`)
      return null
    }
    if (v.warnings.length > 0) warn(`Warnings en ${toDateKey(fecha)}: ${v.warnings.map((w) => w.codigo).join(', ')}`)
    const c = await prisma.planificacionDia.create({
      data: { userId, fecha, turno, proyectoId: proyecto.id, esExcepcional, notas: MARKER, createdById: adminUser.id },
    })
    return c
  }

  step(`1.1 Empleado A, ${toDateKey(lunes)}, dia_completo`)
  const c1 = await crearCelda(empA.userId, lunes, 'dia_completo')
  if (c1) ok(`Celda creada → id=${c1.id.slice(-8)}`)

  step(`1.2 Empleado A, ${toDateKey(martes)}, dia_completo`)
  const c2 = await crearCelda(empA.userId, martes, 'dia_completo')
  if (c2) ok(`Celda creada → id=${c2.id.slice(-8)}`)

  step(`1.3 Empleado B, ${toDateKey(lunes)}, dia_completo`)
  const c3 = await crearCelda(empB.userId, lunes, 'dia_completo')
  if (c3) ok(`Celda creada → id=${c3.id.slice(-8)}`)

  step('1.4 Vista semanal — query por dept y semana')
  const celdasSemana = await prisma.planificacionDia.findMany({
    where: {
      fecha: { gte: lunes, lte: domingo },
      notas: MARKER,
      user: { empleado: { departamentoId: dept.id, activo: true } },
    },
    include: { user: { select: { name: true } }, proyecto: { select: { codigo: true } } },
    orderBy: [{ fecha: 'asc' }, { userId: 'asc' }],
  })

  console.log(`  ◆ Celdas encontradas en dept "${dept.nombre}", semana ${semanaActual}:`)
  for (const c of celdasSemana) {
    const tipo = c.solicitudAusenciaId ? 'ausencia' : 'proyecto'
    console.log(`       ${toDateKey(c.fecha)} | ${c.turno.padEnd(12)} | ${(c.user.name ?? c.userId).padEnd(20)} | tipo=${tipo} | ref=${c.proyecto?.codigo ?? c.solicitudAusenciaId?.slice(-8)}`)
  }
  assert(celdasSemana.length === 3, `3 celdas en vista semanal (lunes A, martes A, lunes B) ✓`, `${celdasSemana.length} celdas (esperadas 3)`)

  const lunesA = celdasSemana.find((c) => c.userId === empA.userId && toDateKey(c.fecha) === toDateKey(lunes))
  const martesA = celdasSemana.find((c) => c.userId === empA.userId && toDateKey(c.fecha) === toDateKey(martes))
  const lunesB = celdasSemana.find((c) => c.userId === empB.userId && toDateKey(c.fecha) === toDateKey(lunes))
  assert(!!lunesA, 'Lunes Empleado A presente ✓', 'Lunes Empleado A ausente')
  assert(!!martesA, 'Martes Empleado A presente ✓', 'Martes Empleado A ausente')
  assert(!!lunesB, 'Lunes Empleado B presente ✓', 'Lunes Empleado B ausente')

  // ══════════════════════════════════════════════════════════════════════════
  section('BLOQUE 2 — Validaciones bloqueantes')
  // ══════════════════════════════════════════════════════════════════════════

  step(`2.1 Sábado ${toDateKey(sabado)} SIN esExcepcional → debe bloquear`)
  const v2a = await validarAsignacion(empA.userId, sabado, 'dia_completo', proyecto.id, false, prisma as unknown as PrismaTx)
  assert(
    !v2a.valido && v2a.errores.some((e) => e.codigo === 'fin_de_semana_no_excepcional'),
    'Sábado sin esExcepcional → bloqueado con fin_de_semana_no_excepcional ✓',
    `Debió bloquear. valido=${v2a.valido}, errores=${JSON.stringify(v2a.errores)}`,
  )

  step(`2.2 Sábado ${toDateKey(sabado)} CON esExcepcional=true → debe pasar y crear celda`)
  const v2b = await validarAsignacion(empA.userId, sabado, 'dia_completo', proyecto.id, true, prisma as unknown as PrismaTx)
  if (!v2b.valido) {
    fail(`Sábado esExcepcional=true debió ser válido. errores=${JSON.stringify(v2b.errores)}`)
  } else {
    const cSab = await prisma.planificacionDia.create({
      data: { userId: empA.userId, fecha: sabado, turno: 'dia_completo', proyectoId: proyecto.id, esExcepcional: true, notas: MARKER, createdById: adminUser.id },
    })
    ok(`Sábado excepcional creado → id=${cSab.id.slice(-8)}`)
  }

  step(`2.3 Crear ausencia aprobada para Empleado A el ${toDateKey(miercoles)}`)
  const solicitudAusencia = await prisma.solicitudAusencia.create({
    data: {
      tipoAusenciaId: tipoAusencia.id,
      solicitanteId: empA.userId,
      fechaInicio: miercoles,
      fechaFin: miercoles,
      turnoInicio: 'dia_completo',
      turnoFin: 'dia_completo',
      motivo: MARKER,
      estado: 'aprobada',
      diasHabiles: 1,
      updatedAt: new Date(),
    },
  })

  const celdaAusencia = await prisma.planificacionDia.create({
    data: {
      userId: empA.userId,
      fecha: miercoles,
      turno: 'dia_completo',
      solicitudAusenciaId: solicitudAusencia.id,
      tipoAusenciaId: tipoAusencia.id,
      proyectoId: null,
      esExcepcional: false,
      notas: MARKER,
      createdById: adminUser.id,
    },
  })
  ok(`Solicitud ${solicitudAusencia.id.slice(-8)} (aprobada) + celda ausencia ${celdaAusencia.id.slice(-8)} creados`)

  step(`2.4 Intentar asignar Empleado A al ${toDateKey(miercoles)} → debe fallar con conflicto_ausencia`)
  const v2c = await validarAsignacion(empA.userId, miercoles, 'dia_completo', proyecto.id, false, prisma as unknown as PrismaTx)
  assert(
    !v2c.valido && v2c.errores.some((e) => e.codigo === 'conflicto_ausencia'),
    'Miércoles bloqueado por conflicto_ausencia ✓',
    `Debió bloquear por conflicto_ausencia. valido=${v2c.valido}, errores=${JSON.stringify(v2c.errores)}`,
  )
  if (!v2c.valido) {
    const err = v2c.errores.find((e) => e.codigo === 'conflicto_ausencia')
    if (err?.detalle) {
      const d = err.detalle as Record<string, unknown>
      console.log(`  ◆ Detalle conflicto: tipo="${d.tipo}", estado="${d.estado}", solicitudId=${String(d.solicitudAusenciaId ?? '').slice(-8)}`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  section('BLOQUE 3 — Vista semanal con mix proyecto + ausencia')
  // ══════════════════════════════════════════════════════════════════════════

  const celdasA = await prisma.planificacionDia.findMany({
    where: { userId: empA.userId, fecha: { gte: lunes, lte: domingo } },
    include: {
      proyecto: { select: { codigo: true } },
      solicitudAusencia: { select: { id: true, estado: true, tipoAusencia: { select: { nombre: true } } } },
    },
    orderBy: { fecha: 'asc' },
  })

  console.log(`  ◆ Celdas de Empleado A (${empA.user.name}) esta semana:`)
  for (const c of celdasA) {
    const tipo = c.solicitudAusenciaId ? 'ausencia' : 'proyecto'
    const ref = tipo === 'ausencia'
      ? `ausencia: ${c.solicitudAusencia?.tipoAusencia?.nombre}`
      : `proyecto: ${c.proyecto?.codigo}`
    console.log(`       ${toDateKey(c.fecha)} (${c.turno}${c.esExcepcional ? ' ★' : ''}) → tipo=${tipo} | ${ref}`)
  }

  const cL = celdasA.find((c) => toDateKey(c.fecha) === toDateKey(lunes))
  const cM = celdasA.find((c) => toDateKey(c.fecha) === toDateKey(martes))
  const cX = celdasA.find((c) => toDateKey(c.fecha) === toDateKey(miercoles))
  const cS = celdasA.find((c) => toDateKey(c.fecha) === toDateKey(sabado))

  assert(
    cL?.proyectoId !== null && cL?.proyectoId !== undefined && cL?.solicitudAusenciaId === null,
    'Lunes Empleado A → tipo=proyecto ✓',
    `Lunes: proyectoId=${cL?.proyectoId}, solicitudAusenciaId=${cL?.solicitudAusenciaId}`,
  )
  assert(
    cM?.proyectoId !== null && cM?.proyectoId !== undefined && cM?.solicitudAusenciaId === null,
    'Martes Empleado A → tipo=proyecto ✓',
    `Martes: proyectoId=${cM?.proyectoId}, solicitudAusenciaId=${cM?.solicitudAusenciaId}`,
  )
  assert(
    cX?.solicitudAusenciaId !== null && cX?.solicitudAusenciaId !== undefined && cX?.proyectoId === null,
    'Miércoles Empleado A → tipo=ausencia ✓',
    `Miércoles: solicitudAusenciaId=${cX?.solicitudAusenciaId}, proyectoId=${cX?.proyectoId}`,
  )
  assert(
    cS?.proyectoId !== null && cS?.proyectoId !== undefined && cS?.esExcepcional === true,
    'Sábado Empleado A → tipo=proyecto, esExcepcional=true ✓',
    `Sábado: proyectoId=${cS?.proyectoId}, esExcepcional=${cS?.esExcepcional}`,
  )

  // ══════════════════════════════════════════════════════════════════════════
  section('BLOQUE 4 — Copiar semana')
  // ══════════════════════════════════════════════════════════════════════════

  // Source cells = MARKER proyecto cells (ausencia cells excluded from source query by the service).
  // Exceptional cells (esExcepcional=true) are skipped and counted in celda_excepcional.
  // Destination may have pre-existing cells (proyecto OR ausencia) that block via celda_ya_existe.
  // Note: ausencia_destino only fires on turno-mismatch (source='am', dest absence='dia_completo').
  // Since all test cells use 'dia_completo', any blocking absence is caught by celda_ya_existe first.

  step('4.0 Pre-cálculo: analizar origen y destino antes de copiar')
  const sourceProj = await prisma.planificacionDia.findMany({
    where: {
      fecha: { gte: lunes, lte: domingo },
      proyectoId: { not: null },
      solicitudAusenciaId: null,
      notas: MARKER,
    },
    select: { userId: true, fecha: true, turno: true, esExcepcional: true },
  })
  step(`Celdas de proyecto en semana origen (notas=MARKER)`, sourceProj.length)

  const sourceProjNoExcepcional = sourceProj.filter((c) => !c.esExcepcional)
  const expectedExcepcional = sourceProj.length - sourceProjNoExcepcional.length

  let expectedCreates = 0
  let expectedBlocked = expectedExcepcional
  for (const celda of sourceProjNoExcepcional) {
    const offset = Math.round((celda.fecha.getTime() - lunes.getTime()) / 86400000)
    const dest = addDays(luneSiguiente, offset)
    const blocker = await prisma.planificacionDia.findFirst({
      where: { userId: celda.userId, fecha: dest, turno: celda.turno },
      select: { solicitudAusenciaId: true, proyectoId: true },
    })
    const nombre = empleados.find((e) => e.userId === celda.userId)?.user.name ?? celda.userId.slice(-6)
    if (blocker) {
      const tipo = blocker.solicitudAusenciaId ? 'ausencia' : 'proyecto'
      console.log(`       [BLOQUEADA → celda_ya_existe] ${toDateKey(dest)} ${nombre} (${tipo} en destino)`)
      expectedBlocked++
    } else {
      console.log(`       [COPIABLE]  ${toDateKey(dest)} ${nombre}`)
      expectedCreates++
    }
  }
  if (expectedExcepcional > 0) {
    console.log(`       [OMITIDA → celda_excepcional] ${expectedExcepcional} celda(s) excepcional(es) no copiadas`)
  }
  console.log(`  ◆ Esperado: celdasCreadas=${expectedCreates}, celdasOmitidas=${expectedBlocked} (${expectedExcepcional} excepcionales + ${expectedBlocked - expectedExcepcional} bloqueadas en destino)`)

  step(`4.1 Primera copia: ${semanaActual} → ${semanaSiguiente} (departamentoId=${dept.id})`)
  const copy1 = await copiarSemana(prisma, semanaActual, semanaSiguiente, dept.id, adminUser.id)
  step('Resultado copia 1', copy1)

  assert(
    copy1.celdasCreadas === expectedCreates,
    `celdasCreadas = ${copy1.celdasCreadas} (esperado ${expectedCreates}) ✓`,
    `celdasCreadas = ${copy1.celdasCreadas} (esperado ${expectedCreates})`,
  )
  assert(
    copy1.celdasOmitidas === expectedBlocked,
    `celdasOmitidas = ${copy1.celdasOmitidas} (esperado ${expectedBlocked}) ✓`,
    `celdasOmitidas = ${copy1.celdasOmitidas} (esperado ${expectedBlocked})`,
  )
  assert(
    copy1.razonesOmision.celda_ya_existe === expectedBlocked,
    `celda_ya_existe = ${copy1.razonesOmision.celda_ya_existe} (esperado ${expectedBlocked}) ✓`,
    `celda_ya_existe = ${copy1.razonesOmision.celda_ya_existe} (esperado ${expectedBlocked})`,
  )
  assert(
    copy1.celdasCreadas + copy1.celdasOmitidas === sourceProj.length,
    `celdasCreadas + celdasOmitidas = ${sourceProj.length} (total origen) ✓`,
    `celdasCreadas(${copy1.celdasCreadas}) + celdasOmitidas(${copy1.celdasOmitidas}) ≠ total(${sourceProj.length})`,
  )

  if (sourceProj.some((c) => c.esExcepcional)) {
    const excCount = copy1.razonesOmision.celda_excepcional
    ok(`El sábado excepcional NO fue copiado (celda_excepcional=${excCount})`)
    assert(excCount > 0, `celda_excepcional = ${excCount} > 0 ✓`, `celda_excepcional debería ser > 0 si hay celdas excepcionales en origen`)
  }

  // Verify cells were actually created in destination week
  const celdasDestino = await prisma.planificacionDia.findMany({
    where: {
      fecha: { gte: luneSiguiente, lte: addDays(luneSiguiente, 6) },
      notas: MARKER,
    },
    select: { userId: true, fecha: true, turno: true, esExcepcional: true, proyectoId: true },
    orderBy: [{ fecha: 'asc' }, { userId: 'asc' }],
  })
  console.log(`  ◆ Celdas creadas en ${semanaSiguiente} (notas=MARKER):`)
  for (const c of celdasDestino) {
    const nombre = empleados.find((e) => e.userId === c.userId)?.user.name ?? c.userId.slice(-6)
    console.log(`       ${toDateKey(c.fecha)} (${c.turno}${c.esExcepcional ? ' ★' : ''}) | ${nombre}`)
  }
  assert(celdasDestino.length === copy1.celdasCreadas, `${celdasDestino.length} celdas en DB = celdasCreadas (${copy1.celdasCreadas}) ✓`, `Celdas en DB (${celdasDestino.length}) ≠ celdasCreadas (${copy1.celdasCreadas})`)

  step(`4.2 Segunda copia (idempotencia): ${semanaActual} → ${semanaSiguiente}`)
  const copy2 = await copiarSemana(prisma, semanaActual, semanaSiguiente, dept.id, adminUser.id)
  step('Resultado copia 2', copy2)

  assert(copy2.celdasCreadas === 0, `celdasCreadas = 0 (idempotencia) ✓`, `celdasCreadas = ${copy2.celdasCreadas} (esperado 0)`)
  assert(
    copy2.celdasOmitidas === sourceProj.length,
    `celdasOmitidas = ${sourceProj.length} (todas omitidas) ✓`,
    `celdasOmitidas = ${copy2.celdasOmitidas} (esperado ${sourceProj.length})`,
  )
  assert(
    copy2.razonesOmision.celda_excepcional === expectedExcepcional,
    `celda_excepcional = ${expectedExcepcional} ✓`,
    `celda_excepcional = ${copy2.razonesOmision.celda_excepcional} (esperado ${expectedExcepcional})`,
  )
  assert(
    copy2.razonesOmision.celda_ya_existe === sourceProjNoExcepcional.length,
    `celda_ya_existe = ${sourceProjNoExcepcional.length} ✓`,
    `celda_ya_existe = ${copy2.razonesOmision.celda_ya_existe} (esperado ${sourceProjNoExcepcional.length})`,
  )

  // ══════════════════════════════════════════════════════════════════════════
  section('BLOQUE 5 — Vista por proyecto')
  // ══════════════════════════════════════════════════════════════════════════

  const celdasProyecto = await prisma.planificacionDia.findMany({
    where: {
      proyectoId: proyecto.id,
      fecha: { gte: lunes, lte: domingo },
      notas: MARKER,
      userId: { in: [empA.userId, empB.userId] },
    },
    select: {
      userId: true,
      fecha: true,
      turno: true,
      esExcepcional: true,
      user: { select: { name: true } },
    },
    orderBy: [{ userId: 'asc' }, { fecha: 'asc' }],
  })

  console.log(`  ◆ Proyecto [${proyecto.codigo}] — personas y días (semana actual, solo Empleados A y B):`)
  const porPersona: Record<string, string[]> = {}
  for (const c of celdasProyecto) {
    const nombre = c.user.name ?? c.userId
    if (!porPersona[nombre]) porPersona[nombre] = []
    porPersona[nombre].push(`${toDateKey(c.fecha)} (${c.turno}${c.esExcepcional ? ' ★' : ''})`)
  }
  for (const [nombre, dias] of Object.entries(porPersona)) {
    console.log(`       ${nombre}: ${dias.join(', ')}`)
  }

  const diasA = celdasProyecto.filter((c) => c.userId === empA.userId).length
  const diasB = celdasProyecto.filter((c) => c.userId === empB.userId).length

  // A: lunes + martes + sabado(excepcional) = 3 (or 2 if sabado creation failed)
  assert(diasA >= 2, `Empleado A tiene ${diasA} días en proyecto (≥2 esperados) ✓`, `Empleado A tiene ${diasA} días (esperado ≥2)`)
  assert(diasB >= 1, `Empleado B tiene ${diasB} días en proyecto (≥1 esperados) ✓`, `Empleado B tiene ${diasB} días (esperado ≥1)`)

  // Verify lunes and martes for Empleado A are marked as proyecto (not ausencia)
  const lunesAproj = celdasProyecto.find((c) => c.userId === empA.userId && toDateKey(c.fecha) === toDateKey(lunes))
  const martesAproj = celdasProyecto.find((c) => c.userId === empA.userId && toDateKey(c.fecha) === toDateKey(martes))
  assert(!!lunesAproj, 'Empleado A, lunes → aparece en vista por proyecto ✓', 'Empleado A, lunes → no aparece en vista por proyecto')
  assert(!!martesAproj, 'Empleado A, martes → aparece en vista por proyecto ✓', 'Empleado A, martes → no aparece en vista por proyecto')

  // Verify miercoles (ausencia) does NOT appear in proyecto view
  const miercolesEnProyecto = celdasProyecto.find((c) => c.userId === empA.userId && toDateKey(c.fecha) === toDateKey(miercoles))
  assert(!miercolesEnProyecto, 'Miércoles (ausencia) NO aparece en vista por proyecto ✓', 'Miércoles aparece en vista por proyecto pero es ausencia — BUG')

  // ══════════════════════════════════════════════════════════════════════════
  section('RESUMEN FINAL')
  // ══════════════════════════════════════════════════════════════════════════

  const totalCeldas = await prisma.planificacionDia.count({ where: { notas: MARKER } })
  console.log(`\n  Total celdas E2E_PLAN en DB (ambas semanas): ${totalCeldas}`)
  console.log(`  Errores detectados: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n✅ Validación planificación e2e completada sin errores. Backend listo para UI.\n')
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
