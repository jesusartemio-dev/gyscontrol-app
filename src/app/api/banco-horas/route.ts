import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularBancoHoras } from '@/lib/services/bancoHoras'

// Mismo allowlist que /api/saldos-ausencia — quien ya puede ver saldos de
// ausencia puede ver el banco de horas de un tercero.
const ROLES_VER_TERCEROS = ['admin', 'administracion', 'gerente', 'gestor', 'coordinador', 'proyectos']

// GET /api/banco-horas?userId=...&hasta=YYYY-MM-DD
// Sin userId: banco de horas del usuario en sesión (autoservicio en
// /mi-trabajo/timesheet). Con userId de un tercero: requiere rol de
// supervisión/RRHH.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId') ?? session.user.id
    const hastaParam = searchParams.get('hasta')
    const hasta = hastaParam ? new Date(`${hastaParam}T00:00:00.000Z`) : new Date()

    if (userId !== session.user.id && !tieneRol(session, ROLES_VER_TERCEROS)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const resultado = await calcularBancoHoras(userId, hasta)
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[GET /api/banco-horas]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
