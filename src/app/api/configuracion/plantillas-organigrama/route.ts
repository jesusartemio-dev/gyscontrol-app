import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const plantillas = await prisma.plantillaOrganigrama.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { nodos: true } },
      },
    })

    return NextResponse.json(plantillas)
  } catch (error) {
    console.error('Error listando plantillas organigrama:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { nombre, descripcion } = body

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const plantilla = await prisma.plantillaOrganigrama.create({
      data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null },
      include: { _count: { select: { nodos: true } } },
    })

    return NextResponse.json(plantilla, { status: 201 })
  } catch (error) {
    console.error('Error creando plantilla organigrama:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
