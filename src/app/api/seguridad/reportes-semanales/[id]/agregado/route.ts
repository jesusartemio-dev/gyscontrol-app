import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerReporteAgregado } from '@/lib/services/reporteSeguridad'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad']

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const data = await obtenerReporteAgregado(id)
    if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (
      session.user.role === 'seguridad' &&
      data.reporte.ingenieroId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('[GET /api/seguridad/reportes-semanales/[id]/agregado]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
