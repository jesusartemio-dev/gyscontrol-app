import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listarJornadasActivasDelDia } from '@/lib/services/registroSeguridad'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    // soloAsignadas default = true (filtra a proyectos del ingeniero)
    const soloAsignadas = searchParams.get('soloAsignadas') !== 'false'
    const proyectoId = searchParams.get('proyectoId') ?? undefined
    const fechaDesdeStr = searchParams.get('fechaDesde')
    const fechaHastaStr = searchParams.get('fechaHasta')
    const fechaDesde = fechaDesdeStr ? new Date(fechaDesdeStr) : undefined
    const fechaHasta = fechaHastaStr ? new Date(fechaHastaStr) : undefined

    const jornadas = await listarJornadasActivasDelDia({
      ingenieroId: session.user.id,
      soloAsignadas,
      proyectoId,
      fechaDesde,
      fechaHasta,
    })

    return NextResponse.json(jornadas)
  } catch (error) {
    console.error('Error al listar jornadas activas:', error)
    return NextResponse.json({ error: 'Error al listar jornadas activas' }, { status: 500 })
  }
}
