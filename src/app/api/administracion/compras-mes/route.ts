import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const mes = searchParams.get('mes') // formato: "2026-06"
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json({ error: 'Parámetro mes requerido (formato: YYYY-MM)' }, { status: 400 })
    }

    const [year, month] = mes.split('-').map(Number)
    const desde = new Date(Date.UTC(year, month - 1, 1))
    const hasta = new Date(Date.UTC(year, month, 1))

    const [cxp, gastos] = await Promise.all([
      prisma.cuentaPorPagar.findMany({
        where: { fechaRecepcion: { gte: desde, lt: hasta } },
        include: {
          proveedor: { select: { id: true, nombre: true, ruc: true } },
          proyecto: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { fechaRecepcion: 'asc' },
      }),
      prisma.gastoLinea.findMany({
        where: { fecha: { gte: desde, lt: hasta } },
        include: {
          hojaDeGastos: {
            select: {
              id: true, numero: true, estado: true,
              proyecto: { select: { id: true, codigo: true, nombre: true } },
              empleado: { select: { id: true, name: true } },
            },
          },
          categoriaGasto: { select: { id: true, nombre: true } },
        },
        orderBy: { fecha: 'asc' },
      }),
    ])

    return NextResponse.json({ cxp, gastos })
  } catch (error) {
    console.error('[GET /compras-mes]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
