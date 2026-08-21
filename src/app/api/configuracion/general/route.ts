import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

// GET - Obtener configuración general (crea si no existe)
export async function GET() {
  try {
    let config = await prisma.configuracionGeneral.findUnique({
      where: { id: 'default' }
    })

    // Si no existe, crear con valores por defecto
    if (!config) {
      config = await prisma.configuracionGeneral.create({
        data: {
          id: 'default',
          tipoCambio: 3.75,
          tipoCambioEur: 1.08,
          horasSemanales: 48,
          diasLaborables: 5,
          semanasxMes: 4,
          horasMensuales: 192,
          turnoAIngreso: '07:30',
          turnoASalida: '18:00',
          turnoBIngreso: '14:00',
          turnoBSalida: '11:30',
          turnoCIngreso: '19:30',
          turnoCSalida: '06:00',
        }
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar configuración general
export async function PUT(req: Request) {
  try {
    const body = await req.json()

    // Calcular horas mensuales automáticamente
    const horasSemanales = body.horasSemanales ?? 48
    const semanasxMes = body.semanasxMes ?? 4
    const horasMensuales = horasSemanales * semanasxMes

    const camposHora = ['turnoAIngreso', 'turnoASalida', 'turnoBIngreso', 'turnoBSalida', 'turnoCIngreso', 'turnoCSalida'] as const
    for (const campo of camposHora) {
      if (body[campo] !== undefined && !HORA_REGEX.test(body[campo])) {
        return NextResponse.json(
          { error: `${campo} debe tener formato HH:MM` },
          { status: 400 }
        )
      }
    }

    const config = await prisma.configuracionGeneral.upsert({
      where: { id: 'default' },
      update: {
        tipoCambio: body.tipoCambio !== undefined ? parseFloat(body.tipoCambio) : undefined,
        tipoCambioEur: body.tipoCambioEur !== undefined ? parseFloat(body.tipoCambioEur) : undefined,
        horasSemanales: body.horasSemanales !== undefined ? parseInt(body.horasSemanales) : undefined,
        diasLaborables: body.diasLaborables !== undefined ? parseInt(body.diasLaborables) : undefined,
        semanasxMes: body.semanasxMes !== undefined ? parseFloat(body.semanasxMes) : undefined,
        horasMensuales,
        turnoAIngreso: body.turnoAIngreso,
        turnoASalida: body.turnoASalida,
        turnoBIngreso: body.turnoBIngreso,
        turnoBSalida: body.turnoBSalida,
        turnoCIngreso: body.turnoCIngreso,
        turnoCSalida: body.turnoCSalida,
        updatedBy: body.updatedBy || null,
      },
      create: {
        id: 'default',
        tipoCambio: body.tipoCambio ?? 3.75,
        tipoCambioEur: body.tipoCambioEur ?? 1.08,
        horasSemanales,
        diasLaborables: body.diasLaborables ?? 5,
        semanasxMes,
        horasMensuales,
        turnoAIngreso: body.turnoAIngreso ?? '07:30',
        turnoASalida: body.turnoASalida ?? '18:00',
        turnoBIngreso: body.turnoBIngreso ?? '14:00',
        turnoBSalida: body.turnoBSalida ?? '11:30',
        turnoCIngreso: body.turnoCIngreso ?? '19:30',
        turnoCSalida: body.turnoCSalida ?? '06:00',
        updatedBy: body.updatedBy || null,
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
