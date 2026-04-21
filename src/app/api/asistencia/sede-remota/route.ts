import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — sede remota actual del trabajador (aprobada o pendiente) + histórico
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = session.user.id
  const sedes = await prisma.ubicacionRemotaPersonal.findMany({
    where: { userId },
    include: {
      aprobadoPor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const activa = sedes.find(s => s.estado === 'aprobada') || null
  const pendiente = sedes.find(s => s.estado === 'pendiente') || null

  return NextResponse.json({ activa, pendiente, historico: sedes })
}

// POST — registrar una nueva sede (queda pendiente de aprobación)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = session.user.id
  const body = await req.json()
  const { nombre, latitud, longitud, radioMetros, observaciones } = body

  if (!nombre || typeof latitud !== 'number' || typeof longitud !== 'number') {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // No permitir si ya hay una pendiente
  const existePendiente = await prisma.ubicacionRemotaPersonal.findFirst({
    where: { userId, estado: 'pendiente' },
  })
  if (existePendiente) {
    return NextResponse.json(
      { error: 'Ya tienes una sede pendiente de aprobación. Espera la revisión o cancélala.' },
      { status: 409 },
    )
  }

  const sede = await prisma.ubicacionRemotaPersonal.create({
    data: {
      userId,
      nombre,
      latitud,
      longitud,
      radioMetros: radioMetros ?? 100,
      observaciones: observaciones || null,
      estado: 'pendiente',
    },
  })

  return NextResponse.json(sede, { status: 201 })
}

// DELETE — cancelar la sede pendiente propia
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = session.user.id
  const result = await prisma.ubicacionRemotaPersonal.deleteMany({
    where: { userId, estado: 'pendiente' },
  })
  return NextResponse.json({ eliminadas: result.count })
}
