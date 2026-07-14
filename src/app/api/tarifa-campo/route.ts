import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')

    const data = await prisma.tarifaCampoPersonal.findMany({
      where: clienteId ? { clienteId } : undefined,
      include: {
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ cliente: { nombre: 'asc' } }, { usuario: { name: 'asc' } }],
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener tarifas de campo:', error)
    return NextResponse.json({ error: 'Error al obtener tarifas de campo' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const payload = await req.json()

    if (!payload.clienteId || !payload.userId) {
      return NextResponse.json({ error: 'Cliente y persona son requeridos' }, { status: 400 })
    }

    const costoAlmuerzo = Number(payload.costoAlmuerzo)
    const costoMovilidad = Number(payload.costoMovilidad)
    if (!Number.isFinite(costoAlmuerzo) || costoAlmuerzo < 0 || !Number.isFinite(costoMovilidad) || costoMovilidad < 0) {
      return NextResponse.json({ error: 'Los montos deben ser números válidos mayores o iguales a 0' }, { status: 400 })
    }

    const [cliente, usuario] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: payload.clienteId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } }),
    ])
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    if (!usuario) return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })

    const data = await prisma.tarifaCampoPersonal.create({
      data: {
        clienteId: payload.clienteId,
        userId: payload.userId,
        costoAlmuerzo,
        costoMovilidad,
        activo: payload.activo !== false,
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(data)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una tarifa para esa persona en ese cliente' }, { status: 409 })
    }
    console.error('Error al crear tarifa de campo:', error)
    return NextResponse.json({ error: 'Error al crear tarifa de campo' }, { status: 500 })
  }
}
