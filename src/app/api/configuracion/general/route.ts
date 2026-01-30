import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
          horasSemanales: 48,
          diasLaborables: 5,
          semanasxMes: 4,
          horasMensuales: 192,
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

    const config = await prisma.configuracionGeneral.upsert({
      where: { id: 'default' },
      update: {
        tipoCambio: body.tipoCambio !== undefined ? parseFloat(body.tipoCambio) : undefined,
        horasSemanales: body.horasSemanales !== undefined ? parseInt(body.horasSemanales) : undefined,
        diasLaborables: body.diasLaborables !== undefined ? parseInt(body.diasLaborables) : undefined,
        semanasxMes: body.semanasxMes !== undefined ? parseInt(body.semanasxMes) : undefined,
        horasMensuales,
        updatedBy: body.updatedBy || null,
      },
      create: {
        id: 'default',
        tipoCambio: body.tipoCambio ?? 3.75,
        horasSemanales,
        diasLaborables: body.diasLaborables ?? 5,
        semanasxMes,
        horasMensuales,
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
