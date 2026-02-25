// ===================================================
// CRON: Actualizar estado de Cartas Fianza y alertas
// Ejecuta diariamente a las 8:00 AM Lima (13:00 UTC)
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

  const now = new Date()
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)

  try {
    // 1. Marcar como vencidas: vigente/por_vencer con fechaVencimiento < hoy
    const vencidasResult = await prisma.cartaFianza.updateMany({
      where: {
        estado: { in: ['vigente', 'por_vencer'] },
        fechaVencimiento: { lt: hoy },
      },
      data: {
        estado: 'vencida',
        updatedAt: new Date(),
      },
    })

    // 2. Marcar como por_vencer: vigente con fechaVencimiento <= 30 días
    const porVencerResult = await prisma.cartaFianza.updateMany({
      where: {
        estado: 'vigente',
        fechaVencimiento: {
          gte: hoy,
          lte: en30Dias,
        },
      },
      data: {
        estado: 'por_vencer',
        updatedAt: new Date(),
      },
    })

    // 3. Consultar cartas por vencer para alertas
    const porVencer = await prisma.cartaFianza.findMany({
      where: {
        estado: 'por_vencer',
      },
      include: {
        proyecto: { select: { codigo: true, nombre: true } },
      },
    })

    // 4. Consultar cartas recién vencidas (últimos 7 días)
    const recienVencidas = await prisma.cartaFianza.findMany({
      where: {
        estado: 'vencida',
        fechaVencimiento: {
          gte: new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000),
          lt: hoy,
        },
      },
      include: {
        proyecto: { select: { codigo: true, nombre: true } },
      },
    })

    // 5. Enviar alertas
    const alertsSent: Record<string, boolean> = { porVencer: false, vencidas: false }

    if (porVencer.length > 0) {
      const totalUSD = porVencer.filter(c => c.moneda === 'USD').reduce((s, c) => s + c.monto, 0)
      const totalPEN = porVencer.filter(c => c.moneda === 'PEN').reduce((s, c) => s + c.monto, 0)

      const detalles = porVencer.map(c =>
        `• ${c.numeroCarta || 'S/N'} — ${c.proyecto?.codigo} — ${c.tipo} — ${c.moneda} ${c.monto.toFixed(2)} — vence ${c.fechaVencimiento.toISOString().split('T')[0]}`
      ).join('\n')

      const montoStr = [
        totalUSD > 0 ? `USD ${totalUSD.toFixed(2)}` : '',
        totalPEN > 0 ? `PEN ${totalPEN.toFixed(2)}` : '',
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
              title: `${porVencer.length} carta(s) fianza por vencer en 30 días (${montoStr})`,
              message: detalles,
              route: '/gestion/cartas-fianza',
              metadata: { count: porVencer.length, totalUSD, totalPEN },
              timestamp: Date.now(),
            }],
            source: 'cron-cartas-fianza',
            timestamp: Date.now(),
          }),
        })
        alertsSent.porVencer = true
      } catch (e) {
        console.error('[cron-cartas-fianza] Error sending por-vencer alert:', e)
      }
    }

    if (recienVencidas.length > 0) {
      const totalUSD = recienVencidas.filter(c => c.moneda === 'USD').reduce((s, c) => s + c.monto, 0)
      const totalPEN = recienVencidas.filter(c => c.moneda === 'PEN').reduce((s, c) => s + c.monto, 0)

      const detalles = recienVencidas.map(c =>
        `• ${c.numeroCarta || 'S/N'} — ${c.proyecto?.codigo} — ${c.tipo} — ${c.moneda} ${c.monto.toFixed(2)} — venció ${c.fechaVencimiento.toISOString().split('T')[0]}`
      ).join('\n')

      const montoStr = [
        totalUSD > 0 ? `USD ${totalUSD.toFixed(2)}` : '',
        totalPEN > 0 ? `PEN ${totalPEN.toFixed(2)}` : '',
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
              title: `${recienVencidas.length} carta(s) fianza vencida(s) (${montoStr})`,
              message: detalles,
              route: '/gestion/cartas-fianza',
              metadata: { count: recienVencidas.length, totalUSD, totalPEN },
              timestamp: Date.now(),
            }],
            source: 'cron-cartas-fianza',
            timestamp: Date.now(),
          }),
        })
        alertsSent.vencidas = true
      } catch (e) {
        console.error('[cron-cartas-fianza] Error sending vencidas alert:', e)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results: {
        marcadasVencidas: vencidasResult.count,
        marcadasPorVencer: porVencerResult.count,
        alertasPorVencer: porVencer.length,
        alertasVencidas: recienVencidas.length,
        alertsSent,
      },
    })
  } catch (error) {
    console.error('[cron-cartas-fianza] Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
