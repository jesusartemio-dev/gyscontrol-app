import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomBytes } from 'crypto'

// GET — listar personal habilitado de un expediente
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const expedienteId = searchParams.get('expedienteId')
    if (!expedienteId) return NextResponse.json({ error: 'expedienteId requerido' }, { status: 400 })

    const personal = await prisma.ssomaPersonalHabilitado.findMany({
      where: { expedienteId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        habilitadoPor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(personal)
  } catch (error) {
    console.error('GET /api/ssoma/personal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST — agregar personal a un expediente
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { expedienteId, userId, cargo } = body

    if (!expedienteId || !userId || !cargo) {
      return NextResponse.json({ error: 'expedienteId, userId y cargo son requeridos' }, { status: 400 })
    }

    // Verificar que el expediente existe
    const expediente = await prisma.ssomaExpediente.findUnique({ where: { id: expedienteId } })
    if (!expediente) {
      return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Generar token único para firma de difusión
    const tokenDifusion = randomBytes(32).toString('hex')

    const personal = await prisma.ssomaPersonalHabilitado.create({
      data: {
        expedienteId,
        userId,
        cargo,
        tokenDifusion,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(personal, { status: 201 })
  } catch (error: any) {
    // Unique constraint violation — ya existe
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Este usuario ya está registrado en el expediente' }, { status: 409 })
    }
    console.error('POST /api/ssoma/personal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT — actualizar estado de habilitación de personal
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const existing = await prisma.ssomaPersonalHabilitado.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, any> = {}

    if (body.estado !== undefined) updateData.estado = body.estado
    if (body.cargo !== undefined) updateData.cargo = body.cargo
    if (body.certAlturaVence !== undefined) updateData.certAlturaVence = body.certAlturaVence ? new Date(body.certAlturaVence) : null
    if (body.certElectricoVence !== undefined) updateData.certElectricoVence = body.certElectricoVence ? new Date(body.certElectricoVence) : null
    if (body.certCalienteVence !== undefined) updateData.certCalienteVence = body.certCalienteVence ? new Date(body.certCalienteVence) : null
    if (body.aptitudMedicaVence !== undefined) updateData.aptitudMedicaVence = body.aptitudMedicaVence ? new Date(body.aptitudMedicaVence) : null

    // Si se está habilitando, registrar quién y cuándo
    if (body.estado === 'habilitado') {
      updateData.habilitadoPorId = (session.user as any).id
      updateData.fechaHabilitacion = new Date()
    }

    const updated = await prisma.ssomaPersonalHabilitado.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        habilitadoPor: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/ssoma/personal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE — eliminar personal de un expediente
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const existing = await prisma.ssomaPersonalHabilitado.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    await prisma.ssomaPersonalHabilitado.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/ssoma/personal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
