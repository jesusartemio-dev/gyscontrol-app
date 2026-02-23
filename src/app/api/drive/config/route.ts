import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSharedDriveId } from '@/lib/services/googleDrive'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
    }

    const adminDriveId = process.env.GOOGLE_ADMIN_DRIVE_ID || null

    return NextResponse.json({
      sharedDriveId: getSharedDriveId(),
      adminDriveId,
    })
  } catch (error) {
    console.error('[Drive] Error getting config:', error)
    return NextResponse.json({ message: 'Error al obtener configuración' }, { status: 500 })
  }
}
