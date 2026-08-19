import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularPisoPlanilla } from '@/lib/administracion/pisoPlanilla'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const data = await calcularPisoPlanilla()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[GET /piso-planilla]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
