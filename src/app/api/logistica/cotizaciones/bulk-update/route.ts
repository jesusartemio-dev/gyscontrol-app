import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { quotationIds, action } = await request.json()

    if (!quotationIds || !Array.isArray(quotationIds) || quotationIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren IDs de cotizaciones válidos' },
        { status: 400 }
      )
    }

    let updateData: Record<string, unknown> = {}

    switch (action) {
      case 'received':
        updateData = { estado: 'solicitado' }
        break
      case 'quoted':
        updateData = { estado: 'cotizado' }
        break
      case 'clear':
        updateData = { estado: 'pendiente' }
        break
      default:
        return NextResponse.json(
          { error: 'Acción no válida. Use: received, quoted, clear' },
          { status: 400 }
        )
    }

    const result = await prisma.cotizacionProveedorItem.updateMany({
      where: {
        id: { in: quotationIds }
      },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      action,
      quotationIds
    })

  } catch (error) {
    console.error('Error in bulk update:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
