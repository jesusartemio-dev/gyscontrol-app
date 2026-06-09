import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listarJornadasActivasDelDia } from '@/lib/services/registroAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    // soloAsignadas default = true (filtra a proyectos del usuario vía PersonalProyecto)
    const soloAsignadas = searchParams.get('soloAsignadas') !== 'false'
    const proyectoId = searchParams.get('proyectoId') ?? undefined
    const fechaDesdeStr = searchParams.get('fechaDesde')
    const fechaHastaStr = searchParams.get('fechaHasta')
    const fechaDesde = fechaDesdeStr ? new Date(fechaDesdeStr) : undefined
    const fechaHasta = fechaHastaStr ? new Date(fechaHastaStr) : undefined

    const jornadas = await listarJornadasActivasDelDia({
      userId: session.user.id,
      role: session.user.role,
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
