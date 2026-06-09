import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerReporteAvanceAgregado } from '@/lib/services/reporteAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const data = await obtenerReporteAvanceAgregado(id)
    if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json(data)
  } catch (e) {
    console.error('[GET /api/proyectos/reportes-semanales/[id]/agregado]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
