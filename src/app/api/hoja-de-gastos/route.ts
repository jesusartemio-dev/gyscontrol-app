import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function generarNumero(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `REQ-${yy}${mm}${dd}`

  const ultimo = await prisma.hojaDeGastos.findFirst({
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
  centroCosto: { select: { id: true, nombre: true, tipo: true, proyectoId: true } },
  empleado: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  lineas: {
    include: { adjuntos: true, categoriaGasto: true },
    orderBy: { fecha: 'asc' as const },
  },
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const centroCostoId = searchParams.get('centroCostoId')
    const estado = searchParams.get('estado')
    const empleadoId = searchParams.get('empleadoId')

    const where: any = {}
    if (centroCostoId) where.centroCostoId = centroCostoId
    if (estado) where.estado = estado
    if (empleadoId) where.empleadoId = empleadoId

    // Filtrar por permisos
    const role = session.user.role
    if (!['admin', 'gerente'].includes(role)) {
      where.OR = [
        { empleadoId: session.user.id },
        { centroCosto: { proyecto: { gestorId: session.user.id } } },
        { centroCosto: { proyecto: { supervisorId: session.user.id } } },
        { centroCosto: { proyecto: { liderId: session.user.id } } },
      ]
    }

    const data = await prisma.hojaDeGastos.findMany({
      where,
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener hojas de gastos:', error)
    return NextResponse.json({ error: 'Error al obtener hojas de gastos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await req.json()

    // Validar centro de costo
    const centroCosto = await prisma.centroCosto.findUnique({ where: { id: payload.centroCostoId } })
    if (!centroCosto) {
      return NextResponse.json({ error: 'Centro de costo no encontrado' }, { status: 404 })
    }
    if (!centroCosto.activo) {
      return NextResponse.json({ error: 'Centro de costo inactivo' }, { status: 400 })
    }

    if (!payload.motivo?.trim()) {
      return NextResponse.json({ error: 'El motivo es requerido' }, { status: 400 })
    }

    const numero = await generarNumero()

    const data = await prisma.hojaDeGastos.create({
      data: {
        numero,
        centroCostoId: payload.centroCostoId,
        empleadoId: payload.empleadoId || session.user.id,
        motivo: payload.motivo.trim(),
        observaciones: payload.observaciones || null,
        requiereAnticipo: payload.requiereAnticipo || false,
        montoAnticipo: payload.requiereAnticipo ? (payload.montoAnticipo || 0) : 0,
        updatedAt: new Date(),
      },
      include: includeRelations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al crear hoja de gastos:', error)
    return NextResponse.json({ error: 'Error al crear hoja de gastos' }, { status: 500 })
  }
}
