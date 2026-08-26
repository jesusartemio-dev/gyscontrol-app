import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { tieneRol } from '@/lib/auth/roles'
import { calcularGruposPagoTerceros } from '@/lib/services/pagoTerceros'

// Roles que supervisan cuadrillas de campo y pueden liquidar terceros.
const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

// GET /api/hoja-de-gastos/pago-terceros/preview?fechaDesde&fechaHasta&proyectoId
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!tieneRol(session, ROLES_PERMITIDOS)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const fechaDesdeStr = searchParams.get('fechaDesde')
    const fechaHastaStr = searchParams.get('fechaHasta')
    const proyectoId = searchParams.get('proyectoId') || undefined

    if (!fechaDesdeStr || !fechaHastaStr) {
      return NextResponse.json({ error: 'fechaDesde y fechaHasta son requeridos' }, { status: 400 })
    }

    const fechaDesde = new Date(`${fechaDesdeStr}T00:00:00`)
    const fechaHasta = new Date(`${fechaHastaStr}T23:59:59.999`)
    if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime()) || fechaDesde > fechaHasta) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    const resultado = await calcularGruposPagoTerceros({ fechaDesde, fechaHasta, proyectoId })
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Error al previsualizar pago a terceros:', error)
    return NextResponse.json({ error: 'Error al calcular la liquidación' }, { status: 500 })
  }
}
