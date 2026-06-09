import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerEvidenciaPorJornada } from '@/lib/services/evidenciaAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jornadaId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { jornadaId } = await params
    const evidencia = await obtenerEvidenciaPorJornada(jornadaId)
    if (!evidencia) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 })
    }

    return NextResponse.json(evidencia)
  } catch (error) {
    console.error('Error al obtener evidencia de avance por jornada:', error)
    return NextResponse.json({ error: 'Error al obtener evidencia' }, { status: 500 })
  }
}
