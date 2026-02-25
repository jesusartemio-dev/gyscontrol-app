import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularAging, type CxCConRelaciones } from '@/lib/utils/agingUtils'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const clienteId = searchParams.get('clienteId')
    const moneda = searchParams.get('moneda')
    const tc = searchParams.get('tc')

    const where: Record<string, unknown> = {
      saldoPendiente: { gt: 0 },
      estado: { in: ['pendiente', 'parcial', 'vencida'] },
    }
    if (clienteId) where.clienteId = clienteId
    if (moneda && (moneda === 'PEN' || moneda === 'USD')) where.moneda = moneda

    const cxcs = await prisma.cuentaPorCobrar.findMany({
      where,
      select: {
        id: true,
        clienteId: true,
        numeroDocumento: true,
        descripcion: true,
        moneda: true,
        monto: true,
        saldoPendiente: true,
        fechaEmision: true,
        fechaVencimiento: true,
        estado: true,
        cliente: { select: { id: true, nombre: true, ruc: true } },
        proyecto: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: [
        { clienteId: 'asc' },
        { fechaVencimiento: 'asc' },
      ],
    })

    const hoy = new Date()
    const tcDefault = parseFloat(tc ?? '3.75')

    const resultado = calcularAging(cxcs as CxCConRelaciones[], hoy, tcDefault)

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Error al generar Aging CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
