import { NextRequest, NextResponse } from 'next/server'
import { logStatusChange } from '@/lib/services/auditLogger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      entityType,
      entityId,
      oldStatus,
      newStatus,
      description,
      metadata
    } = body

    // Validar datos requeridos
    if (!userId || !entityType || !entityId || !newStatus) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Registrar el cambio de estado
    await logStatusChange({
      userId,
      entityType,
      entityId,
      oldStatus,
      newStatus,
      description,
      metadata
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging status change:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}