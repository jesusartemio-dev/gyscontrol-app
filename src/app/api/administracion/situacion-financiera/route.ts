import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularSituacionFinanciera } from '@/lib/administracion/situacionFinanciera'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const desdeParam = searchParams.get('desde')
    const hastaParam = searchParams.get('hasta')
    const clienteId = searchParams.get('clienteId') || undefined
    const monedaParam = searchParams.get('moneda')
    const moneda = monedaParam === 'PEN' || monedaParam === 'USD' || monedaParam === 'EUR' ? monedaParam : undefined

    if (!desdeParam || !hastaParam) {
      return NextResponse.json({ error: 'desde y hasta son requeridos (formato: YYYY-MM-DD)' }, { status: 400 })
    }
    const desde = new Date(`${desdeParam}T00:00:00Z`)
    const hasta = new Date(`${hastaParam}T00:00:00Z`)
    if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || hasta <= desde) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    const data = await calcularSituacionFinanciera({ desde, hasta, clienteId, moneda })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[GET /situacion-financiera]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
