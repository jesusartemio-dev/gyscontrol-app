import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

// GET — List all cartas fianza (global view with filters)
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
    const estado = searchParams.get('estado')
    const tipo = searchParams.get('tipo')
    const proyectoId = searchParams.get('proyectoId')

    const where: Record<string, unknown> = {}
    if (estado) where.estado = estado
    if (tipo) where.tipo = tipo
    if (proyectoId) where.proyectoId = proyectoId

    const cartas = await prisma.cartaFianza.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true, cliente: { select: { nombre: true } } } },
        adjuntos: { select: { id: true, nombreArchivo: true, urlArchivo: true } },
        cartaRenovada: { select: { id: true, numeroCarta: true } },
        renovaciones: { select: { id: true, numeroCarta: true, estado: true, fechaVencimiento: true } },
      },
      orderBy: { fechaVencimiento: 'asc' },
    })

    // Summary counts
    const now = new Date()
    const en30Dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    let vigentes = 0
    let porVencer = 0
    let vencidas = 0
    let montoTotalUSD = 0
    let montoTotalPEN = 0

    for (const c of cartas) {
      if (c.estado === 'vigente') vigentes++
      if (c.estado === 'por_vencer') porVencer++
      if (c.estado === 'vencida') vencidas++
      if (c.estado === 'vigente' || c.estado === 'por_vencer') {
        if (c.moneda === 'USD') montoTotalUSD += c.monto
        else montoTotalPEN += c.monto
      }
    }

    return NextResponse.json({
      cartas,
      resumen: {
        total: cartas.length,
        vigentes,
        porVencer,
        vencidas,
        montoTotalUSD,
        montoTotalPEN,
      },
    })
  } catch (error) {
    console.error('Error al listar cartas fianza:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
