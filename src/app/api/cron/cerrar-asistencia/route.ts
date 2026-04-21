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

    // Salidas del día (para excluir usuarios que ya marcaron)
    const salidas = await prisma.asistencia.findMany({
      where: {
        tipo: 'salida',
        fechaHora: { gte: inicioDiaLima, lte: finDiaLima },
      },
      select: { userId: true },
    })
    const usuariosConSalida = new Set(salidas.map(s => s.userId))

    const pendientes = ingresos.filter(i => !usuariosConSalida.has(i.userId))

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
        const fechaEsperada = await calcularFechaEsperada(
          ahora,
          'salida',
          ingreso.ubicacion,
          'empresa',
          'default',
          jornadaOverride,
        )

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

    return NextResponse.json({
      ok: true,
      fecha: fechaLima,
      revisados: ingresos.length,
      yaTenianSalida: ingresos.length - pendientes.length,
      cerradasAutomaticamente: cerradas.length,
      errores,
    })
  } catch (error: any) {
    console.error('[cerrar-asistencia] error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
