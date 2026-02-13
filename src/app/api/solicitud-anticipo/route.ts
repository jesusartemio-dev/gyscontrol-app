import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Generar número correlativo: ANT-YYMMDD-XXX
async function generarNumero(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `ANT-${yy}${mm}${dd}`

  const ultimo = await prisma.solicitudAnticipo.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultimo) {
    const parts = ultimo.numero.split('-')
    correlativo = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

const includeRelations = {
  proyecto: { select: { id: true, nombre: true, codigo: true } },
  solicitante: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  rendiciones: {
    select: { id: true, numero: true, estado: true, montoTotal: true },
  },
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    const where: any = {}
    if (proyectoId) where.proyectoId = proyectoId
    if (estado) where.estado = estado

    // Filtrar por permisos
    const role = session.user.role
    if (!['admin', 'gerente'].includes(role)) {
      where.OR = [
        { solicitanteId: session.user.id },
        { proyecto: { gestorId: session.user.id } },
        { proyecto: { supervisorId: session.user.id } },
        { proyecto: { liderId: session.user.id } },
      ]
    }

    const data = await prisma.solicitudAnticipo.findMany({
      where,
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener anticipos:', error)
    return NextResponse.json({ error: 'Error al obtener anticipos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await req.json()

    // Validar proyecto existe
    const proyecto = await prisma.proyecto.findUnique({ where: { id: payload.proyectoId } })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const numero = await generarNumero()

    const data = await prisma.solicitudAnticipo.create({
      data: {
        numero,
        proyectoId: payload.proyectoId,
        solicitanteId: payload.solicitanteId || session.user.id,
        monto: payload.monto,
        moneda: payload.moneda || 'PEN',
        motivo: payload.motivo,
        fechaInicio: payload.fechaInicio ? new Date(payload.fechaInicio) : null,
        fechaFin: payload.fechaFin ? new Date(payload.fechaFin) : null,
        updatedAt: new Date(),
      },
      include: includeRelations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al crear anticipo:', error)
    return NextResponse.json({ error: 'Error al crear anticipo' }, { status: 500 })
  }
}
