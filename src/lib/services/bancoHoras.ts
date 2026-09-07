// ===================================================
// Banco de Horas — horas trabajadas vs. jornada esperada
// ===================================================
//
// Se calcula SOLO desde RegistroHoras con aprobado=true (lo que ya pasó por
// el flujo de timesheet/jornada), nunca desde Asistencia (marcaje físico).
// Ver DISENO en el plan de la sesión — regla completa documentada ahí.

import { prisma } from '@/lib/prisma'
import { formatearSemanaIso } from '@/lib/utils/isoWeek'
import type { EstadoSolicitudAusencia } from '@prisma/client'

export interface DiaBancoHoras {
  fecha: string // YYYY-MM-DD
  diaSemana: number // 0=domingo … 6=sábado (Date.getUTCDay())
  horasTrabajadas: number
  horaEsperada: number
  delta: number
  /** Ausencia aprobada o BancoHorasAjusteDia ese día — no penaliza ni acredita de más. */
  cubierto: boolean
  /** true si ese día tuvo excedente y la semana se pagó en efectivo (no se acumuló). */
  pagadoEnEfectivo: boolean
}

export interface BancoHorasResultado {
  userId: string
  saldoInicial: number
  fechaCorte: string
  acumulado: number
  dias: DiaBancoHoras[]
}

interface JornadaSemana {
  lunes: number
  martes: number
  miercoles: number
  jueves: number
  viernes: number
  sabado: number
  domingo: number
}

const JORNADA_DEFAULT: JornadaSemana = {
  lunes: 9.5, martes: 9.5, miercoles: 9.5, jueves: 9.5, viernes: 10, sabado: 0, domingo: 0,
}

async function getJornadaEsperada(): Promise<JornadaSemana> {
  const config = await prisma.jornadaEsperada.findFirst({ where: { activo: true }, orderBy: { createdAt: 'desc' } })
  return config ?? JORNADA_DEFAULT
}

function horaEsperadaDelDia(jornada: JornadaSemana, diaSemana: number): number {
  const porDia = [jornada.domingo, jornada.lunes, jornada.martes, jornada.miercoles, jornada.jueves, jornada.viernes, jornada.sabado]
  return porDia[diaSemana]
}

function claveFecha(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function medianocheUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

const ESTADOS_AUSENCIA_APROBADA: EstadoSolicitudAusencia[] = ['aprobada', 'en_curso', 'finalizada']

/**
 * Calcula el banco de horas de un usuario desde su fecha de corte
 * (BancoHorasSaldoInicial, o hoy si nunca se le importó saldo) hasta `hasta`.
 */
export async function calcularBancoHoras(userId: string, hasta: Date = new Date()): Promise<BancoHorasResultado> {
  const saldoRow = await prisma.bancoHorasSaldoInicial.findUnique({ where: { userId } })
  const saldoInicial = saldoRow?.saldoInicial ?? 0
  const fin = medianocheUtc(hasta)
  const inicio = saldoRow ? medianocheUtc(saldoRow.fechaCorte) : fin

  if (inicio > fin) {
    return { userId, saldoInicial, fechaCorte: claveFecha(inicio), acumulado: saldoInicial, dias: [] }
  }

  const [jornada, registros, ajustesDia, ausencias, semanasPagadasRows] = await Promise.all([
    getJornadaEsperada(),
    prisma.registroHoras.findMany({
      where: { usuarioId: userId, aprobado: true, fechaTrabajo: { gte: inicio, lte: fin } },
      select: { fechaTrabajo: true, horasTrabajadas: true },
    }),
    prisma.bancoHorasAjusteDia.findMany({
      where: { userId, fecha: { gte: inicio, lte: fin } },
      select: { fecha: true },
    }),
    prisma.solicitudAusencia.findMany({
      where: {
        solicitanteId: userId,
        estado: { in: ESTADOS_AUSENCIA_APROBADA },
        fechaInicio: { lte: fin },
        fechaFin: { gte: inicio },
      },
      select: { fechaInicio: true, fechaFin: true },
    }),
    prisma.timesheetAprobacion.findMany({
      where: { usuarioId: userId, pagadoEnEfectivo: true },
      select: { semana: true },
    }),
  ])

  const horasPorDia = new Map<string, number>()
  for (const r of registros) {
    const k = claveFecha(r.fechaTrabajo)
    horasPorDia.set(k, (horasPorDia.get(k) ?? 0) + r.horasTrabajadas)
  }

  const diasAjustados = new Set(ajustesDia.map((a) => claveFecha(a.fecha)))
  const semanasPagadas = new Set(semanasPagadasRows.map((t) => t.semana))

  const diasCubiertosAusencia = new Set<string>()
  for (const a of ausencias) {
    const cursorAusencia = medianocheUtc(a.fechaInicio)
    const finAusencia = medianocheUtc(a.fechaFin)
    while (cursorAusencia <= finAusencia) {
      diasCubiertosAusencia.add(claveFecha(cursorAusencia))
      cursorAusencia.setUTCDate(cursorAusencia.getUTCDate() + 1)
    }
  }

  const dias: DiaBancoHoras[] = []
  let acumulado = saldoInicial
  const cursor = new Date(inicio)
  while (cursor <= fin) {
    const key = claveFecha(cursor)
    const diaSemana = cursor.getUTCDay()
    const horaEsperada = horaEsperadaDelDia(jornada, diaSemana)
    const horasTrabajadas = horasPorDia.get(key) ?? 0
    const cubierto = diasCubiertosAusencia.has(key) || diasAjustados.has(key)

    let delta: number
    if (cubierto) {
      delta = 0
    } else if (diaSemana === 0) {
      delta = horasTrabajadas * 2 // domingo vale doble
    } else if (diaSemana === 6) {
      delta = horasTrabajadas // sábado: esperado 0, todo es excedente
    } else {
      delta = horasTrabajadas - horaEsperada
    }

    const semana = formatearSemanaIso(cursor)
    const excluidoPorPago = delta > 0 && semanasPagadas.has(semana)
    acumulado += excluidoPorPago ? 0 : delta

    dias.push({ fecha: key, diaSemana, horasTrabajadas, horaEsperada, delta, cubierto, pagadoEnEfectivo: excluidoPorPago })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return { userId, saldoInicial, fechaCorte: claveFecha(inicio), acumulado, dias }
}
