import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generarSecret } from '@/lib/utils/qrTotp'

const ROLES_ADMIN = ['admin', 'gerente']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const data = await prisma.ubicacion.findMany({
    orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
  })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    if (!body.nombre || body.latitud == null || body.longitud == null || !body.tipo) {
      return NextResponse.json({ message: 'Datos incompletos' }, { status: 400 })
    }

    const ubicacion = await prisma.ubicacion.create({
      data: {
        nombre: body.nombre,
        tipo: body.tipo,
        direccion: body.direccion || null,
        latitud: parseFloat(body.latitud),
        longitud: parseFloat(body.longitud),
        radioMetros: body.radioMetros ?? 150,
        qrSecret: generarSecret(),
        proyectoId: body.proyectoId || null,
        activo: body.activo ?? true,
        toleranciaMinutos: body.toleranciaMinutos ?? 5,
        limiteTardeMinutos: body.limiteTardeMinutos ?? 30,
      },
    })
    return NextResponse.json(ubicacion)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ message: 'Ya existe una ubicación con ese nombre' }, { status: 400 })
    }
    console.error('[POST /asistencia/ubicaciones]', error)
    return NextResponse.json({ message: 'Error al crear ubicación' }, { status: 500 })
  }
}
