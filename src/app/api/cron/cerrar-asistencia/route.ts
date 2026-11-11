// ===================================================
// CRON: Cierre automático de asistencia
// Ejecuta diariamente a las 04:59 UTC (23:59 Lima)
// Busca ingresos del día sin salida correspondiente y
// registra una salida automática a la hora oficial de la
// ubicación (o a la hora actual si no hay horario definido).
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularFechaEsperada } from '@/lib/services/asistencia'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rango del día en hora Lima
  const ahora = new Date()
  const fechaLima = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
  const inicioDiaLima = new Date(`${fechaLima}T00:00:00-05:00`)
  const finDiaLima = new Date(`${fechaLima}T23:59:59-05:00`)

  try {
    // Ingresos del día
    const ingresos = await prisma.asistencia.findMany({
      where: {
        tipo: 'ingreso',
        fechaHora: { gte: inicioDiaLima, lte: finDiaLima },
      },
      include: {
        ubicacion: true,
        jornadaAsistencia: true,
        dispositivo: true,
      },
    })

    // Salidas del día, agrupadas POR SESIÓN de asistencia.
    //
    // Antes era un único Set de userId para todo el día: si alguien tenía dos
    // sesiones abiertas en la misma sede (pasa cuando dos supervisores abren
    // cada uno la suya) y marcaba salida en una, el cron lo daba por cerrado y
    // la otra se quedaba con el ingreso colgando para siempre.
    const salidas = await prisma.asistencia.findMany({
      where: {
        tipo: 'salida',
        fechaHora: { gte: inicioDiaLima, lte: finDiaLima },
      },
      select: { userId: true, jornadaAsistenciaId: true },
    })
    const SIN_JORNADA = '__sin_jornada__'
    const salidasPorJornada = new Map<string, Set<string>>()
    for (const s of salidas) {
      const k = s.jornadaAsistenciaId ?? SIN_JORNADA
      if (!salidasPorJornada.has(k)) salidasPorJornada.set(k, new Set())
      salidasPorJornada.get(k)!.add(s.userId)
    }

    const pendientes = ingresos.filter(i => {
      const k = i.jornadaAsistenciaId ?? SIN_JORNADA
      return !salidasPorJornada.get(k)?.has(i.userId)
    })

    const cerradas: string[] = []
    const errores: { userId: string; error: string }[] = []

    for (const ingreso of pendientes) {
      try {
        // Calcular fechaEsperada de salida
        const jornadaOverride = ingreso.jornadaAsistencia
          ? {
              horaIngresoOverride: ingreso.jornadaAsistencia.horaIngresoOverride,
              horaSalidaOverride: ingreso.jornadaAsistencia.horaSalidaOverride,
            }
          : null
        let fechaEsperada = await calcularFechaEsperada(
          ahora,
          'salida',
          ingreso.ubicacion,
          'empresa',
          'default',
          jornadaOverride,
        )

        // Turno nocturno: si la salida esperada cae antes del ingreso real, es del día siguiente
        // (ej. ingreso 19:00 lunes → salida override 07:00 → calcularFechaEsperada devuelve 07:00 lunes)
        if (fechaEsperada <= ingreso.fechaHora) {
          fechaEsperada = new Date(fechaEsperada.getTime() + 24 * 60 * 60 * 1000)
        }

        // El trabajador aún está en turno — no auto-cerrar
        if (fechaEsperada > ahora) {
          continue
        }

        await prisma.asistencia.create({
          data: {
            userId: ingreso.userId,
            empleadoId: ingreso.empleadoId,
            ubicacionId: ingreso.ubicacionId,
            jornadaAsistenciaId: ingreso.jornadaAsistenciaId,
            tipo: 'salida',
            fechaHora: fechaEsperada, // se registra a la hora oficial de salida
            fechaEsperada,
            minutosTarde: 0,
            dentroGeofence: true,
            metodoMarcaje: 'manual_supervisor',
            dispositivoId: ingreso.dispositivoId,
            dispositivoEraNuevo: false,
            estado: 'a_tiempo',
            observacion: 'Cierre automático: el trabajador no marcó salida',
            banderas: ['auto_cierre'],
          },
        })
        cerradas.push(ingreso.userId)
      } catch (e: any) {
        errores.push({ userId: ingreso.userId, error: e.message })
      }
    }

    // Cerrar las sesiones de asistencia (el QR) en las que ya todos salieron.
    //
    // La sesión sólo se cerraba si el supervisor apretaba "Cerrar" en la
    // pantalla del QR, y casi nadie lo hace: para él el día terminó cuando
    // cerró la jornada de campo — que además puede cerrarse 2 o 3 días
    // después, cuando llena los avances. El resultado eran sesiones abiertas
    // meses, que le seguían apareciendo al trabajador en /mi-trabajo/marcar y
    // hacían que marcara en la sesión equivocada.
    //
    // Sólo se cierran las completas. Una sesión donde alguien no marcó salida
    // se deja abierta a propósito: el supervisor tiene que entrar y registrar
    // esa salida a mano, y si la cerramos nosotros deja de verla.
    const sesionesCerradas = await cerrarSesionesCompletas()

    return NextResponse.json({
      ok: true,
      fecha: fechaLima,
      revisados: ingresos.length,
      yaTenianSalida: ingresos.length - pendientes.length,
      cerradasAutomaticamente: cerradas.length,
      sesionesCerradas,
      errores,
    })
  } catch (error: any) {
    console.error('[cerrar-asistencia] error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Cierra toda sesión de asistencia activa en la que cada persona con ingreso
 * tenga ya su salida. Devuelve cuántas cerró.
 *
 * Mira todas las activas, no sólo las de hoy: las que se acumularon antes de
 * que esto existiera también se limpian en la primera corrida.
 */
async function cerrarSesionesCompletas(): Promise<number> {
  const activas = await prisma.jornadaAsistencia.findMany({
    where: { activa: true },
    select: {
      id: true,
      asistencias: { select: { userId: true, tipo: true } },
    },
  })

  const completas = activas
    .filter(j => {
      const conIngreso = new Set(
        j.asistencias.filter(a => a.tipo === 'ingreso').map(a => a.userId),
      )
      // Sin ingresos no hay nada que cerrar; se abrió y nadie la usó.
      if (conIngreso.size === 0) return false
      const conSalida = new Set(
        j.asistencias.filter(a => a.tipo === 'salida').map(a => a.userId),
      )
      return [...conIngreso].every(u => conSalida.has(u))
    })
    .map(j => j.id)

  if (completas.length === 0) return 0

  const { count } = await prisma.jornadaAsistencia.updateMany({
    where: { id: { in: completas }, activa: true },
    data: { activa: false, cerradaEn: new Date() },
  })
  return count
}
