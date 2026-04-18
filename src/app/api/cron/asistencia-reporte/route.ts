// ===================================================
// CRON: Reporte diario de asistencia
// Ejecuta diariamente a las 19:00 UTC (14:00 Lima)
// Detecta empleados activos que no marcaron ingreso hoy
// y envía alerta al sistema de monitoring.
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const inicioDia = new Date()
  inicioDia.setHours(0, 0, 0, 0)
  const finDia = new Date()
  finDia.setHours(23, 59, 59, 999)

  try {
    const empleadosActivos = await prisma.empleado.findMany({
      where: { activo: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
        departamento: { select: { nombre: true } },
      },
    })

    const ingresosHoy = await prisma.asistencia.findMany({
      where: { tipo: 'ingreso', fechaHora: { gte: inicioDia, lte: finDia } },
      select: { userId: true, estado: true, minutosTarde: true },
    })

    const userIdsMarcaron = new Set(ingresosHoy.map(i => i.userId))
    const ausentes = empleadosActivos.filter(e => !userIdsMarcaron.has(e.userId))

    const tardanzas = ingresosHoy.filter(i => i.estado === 'tarde' || i.estado === 'muy_tarde')
    const totalMinTarde = tardanzas.reduce((s, t) => s + t.minutosTarde, 0)

    if (ausentes.length > 0 || tardanzas.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const detalles = [
        ausentes.length > 0
          ? `Sin marcaje: ${ausentes
              .slice(0, 20)
              .map(a => `${a.user.name || a.user.email}${a.departamento ? ` (${a.departamento.nombre})` : ''}`)
              .join(', ')}${ausentes.length > 20 ? ` y ${ausentes.length - 20} más` : ''}`
          : null,
        tardanzas.length > 0
          ? `${tardanzas.length} tardanzas (${totalMinTarde} min acumulados)`
          : null,
      ]
        .filter(Boolean)
        .join('\n')

      try {
        await fetch(`${baseUrl}/api/monitoring/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alerts: [
              {
                type: 'custom',
                severity: ausentes.length > 5 ? 'error' : 'warning',
                title: `Reporte diario de asistencia: ${ausentes.length} sin marcaje, ${tardanzas.length} tardanzas`,
                message: detalles,
                route: '/admin/asistencia/dashboard',
                metadata: {
                  ausentes: ausentes.length,
                  tardanzas: tardanzas.length,
                  totalMinTarde,
                },
                timestamp: Date.now(),
              },
            ],
            source: 'cron-asistencia',
            timestamp: Date.now(),
          }),
        })
      } catch (e) {
        console.error('[cron-asistencia] Error enviando alerta', e)
      }
    }

    return NextResponse.json({
      ok: true,
      fecha: inicioDia.toISOString(),
      empleadosActivos: empleadosActivos.length,
      marcajesHoy: ingresosHoy.length,
      ausentes: ausentes.length,
      tardanzas: tardanzas.length,
      totalMinTarde,
    })
  } catch (error) {
    console.error('[cron-asistencia] Error:', error)
    return NextResponse.json(
      { error: 'Error en reporte de asistencia', details: String(error) },
      { status: 500 },
    )
  }
}
