// ===================================================
// CRON: Actualizar CxC vencidas y enviar alertas
// Ejecuta diariamente a las 8:00 AM Lima (13:00 UTC)
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // 1. Autenticación: verificar CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // midnight today

  try {
    // 2. Marcar como vencidas: pendiente/parcial con fechaVencimiento < hoy
    const updateResult = await prisma.cuentaPorCobrar.updateMany({
      where: {
        estado: { in: ['pendiente', 'parcial'] },
        fechaVencimiento: { lt: hoy },
      },
      data: {
        estado: 'vencida',
        updatedAt: new Date(),
      },
    })

    // 3. Consultar CxC que vencen en los próximos 7 días (para alertas "por vencer")
    const en7Dias = new Date(hoy)
    en7Dias.setDate(en7Dias.getDate() + 7)

    const porVencer = await prisma.cuentaPorCobrar.findMany({
      where: {
        estado: { in: ['pendiente', 'parcial'] },
        fechaVencimiento: {
          gte: hoy,
          lte: en7Dias,
        },
      },
      include: {
        proyecto: { select: { codigo: true, nombre: true } },
        cliente: { select: { nombre: true } },
      },
    })

    // 4. Consultar CxC recién marcadas como vencidas (para alertas "vencidas")
    const recienVencidas = await prisma.cuentaPorCobrar.findMany({
      where: {
        estado: 'vencida',
        fechaVencimiento: {
          gte: new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000), // últimos 7 días
          lt: hoy,
        },
      },
      include: {
        proyecto: { select: { codigo: true, nombre: true } },
        cliente: { select: { nombre: true } },
      },
    })

    // 5. Enviar alertas si hay CxC por vencer o vencidas
    const alertsSent: Record<string, boolean> = { porVencer: false, vencidas: false, fondosGarantia: false }

    if (porVencer.length > 0) {
      const totalPEN = porVencer
        .filter(c => c.moneda === 'PEN')
        .reduce((s, c) => s + c.saldoPendiente, 0)
      const totalUSD = porVencer
        .filter(c => c.moneda === 'USD')
        .reduce((s, c) => s + c.saldoPendiente, 0)

      const detalles = porVencer.map(c =>
        `• ${c.numeroDocumento || 'S/N'} — ${c.cliente?.nombre} — ${c.proyecto?.codigo} — ${c.moneda} ${c.saldoPendiente.toFixed(2)} — vence ${c.fechaVencimiento.toISOString().split('T')[0]}`
      ).join('\n')

      const montoStr = [
        totalPEN > 0 ? `PEN ${totalPEN.toFixed(2)}` : '',
        totalUSD > 0 ? `USD ${totalUSD.toFixed(2)}` : '',
      ].filter(Boolean).join(' + ')

      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await fetch(`${baseUrl}/api/monitoring/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alerts: [{
              type: 'custom',
              severity: 'warning',
              title: `${porVencer.length} CxC por vencer en 7 días (${montoStr})`,
              message: detalles,
              route: '/administracion/cuentas-cobrar',
              metadata: { count: porVencer.length, totalPEN, totalUSD },
              timestamp: Date.now(),
            }],
            source: 'cron-vencimiento',
            timestamp: Date.now(),
          }),
        })
        alertsSent.porVencer = true
      } catch (e) {
        console.error('[cron-vencimiento] Error sending por-vencer alert:', e)
      }
    }

    if (recienVencidas.length > 0) {
      const totalPEN = recienVencidas
        .filter(c => c.moneda === 'PEN')
        .reduce((s, c) => s + c.saldoPendiente, 0)
      const totalUSD = recienVencidas
        .filter(c => c.moneda === 'USD')
        .reduce((s, c) => s + c.saldoPendiente, 0)

      const detalles = recienVencidas.map(c =>
        `• ${c.numeroDocumento || 'S/N'} — ${c.cliente?.nombre} — ${c.proyecto?.codigo} — ${c.moneda} ${c.saldoPendiente.toFixed(2)} — venció ${c.fechaVencimiento.toISOString().split('T')[0]}`
      ).join('\n')

      const montoStr = [
        totalPEN > 0 ? `PEN ${totalPEN.toFixed(2)}` : '',
        totalUSD > 0 ? `USD ${totalUSD.toFixed(2)}` : '',
      ].filter(Boolean).join(' + ')

      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await fetch(`${baseUrl}/api/monitoring/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alerts: [{
              type: 'custom',
              severity: 'error',
              title: `${recienVencidas.length} CxC vencidas (${montoStr})`,
              message: detalles,
              route: '/administracion/cuentas-cobrar',
              metadata: { count: recienVencidas.length, totalPEN, totalUSD },
              timestamp: Date.now(),
            }],
            source: 'cron-vencimiento',
            timestamp: Date.now(),
          }),
        })
        alertsSent.vencidas = true
      } catch (e) {
        console.error('[cron-vencimiento] Error sending vencidas alert:', e)
      }
    }

    // 6. Fondos de garantía por vencer en 30 días
    const en30Dias = new Date(hoy)
    en30Dias.setDate(en30Dias.getDate() + 30)

    const fondosGarantiaPorVencer = await prisma.cuentaPorCobrar.findMany({
      where: {
        estado: { in: ['pendiente', 'parcial'] },
        descripcion: { startsWith: 'Fondo de Garantía' },
        fechaVencimiento: {
          gte: hoy,
          lte: en30Dias,
        },
      },
      include: {
        proyecto: { select: { codigo: true, nombre: true } },
        cliente: { select: { nombre: true } },
      },
    })

    if (fondosGarantiaPorVencer.length > 0) {
      const detalles = fondosGarantiaPorVencer.map(c =>
        `• ${c.proyecto?.codigo} — ${c.cliente?.nombre} — ${c.moneda} ${c.saldoPendiente.toFixed(2)} — vence ${c.fechaVencimiento.toISOString().split('T')[0]}`
      ).join('\n')

      const totalMonto = fondosGarantiaPorVencer.reduce((s, c) => s + c.saldoPendiente, 0)

      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await fetch(`${baseUrl}/api/monitoring/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alerts: [{
              type: 'custom',
              severity: 'warning',
              title: `${fondosGarantiaPorVencer.length} fondo(s) de garantía vencen en 30 días (${totalMonto.toFixed(2)})`,
              message: detalles,
              route: '/administracion/cuentas-cobrar',
              metadata: { count: fondosGarantiaPorVencer.length, totalMonto },
              timestamp: Date.now(),
            }],
            source: 'cron-vencimiento',
            timestamp: Date.now(),
          }),
        })
        alertsSent.fondosGarantia = true
      } catch (e) {
        console.error('[cron-vencimiento] Error sending fondo garantía alert:', e)
      }
    }

    // 7. Respuesta
    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      marcadasVencidas: updateResult.count,
      porVencerEn7Dias: porVencer.length,
      recienVencidas: recienVencidas.length,
      fondosGarantiaPorVencer: fondosGarantiaPorVencer.length,
      alertsSent,
    })
  } catch (error) {
    console.error('[cron-vencimiento] Error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar vencimientos', details: String(error) },
      { status: 500 }
    )
  }
}
