import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    const plantilla = await prisma.plantillaOrganigrama.findUnique({
      where: { id },
      include: {
        nodos: {
          orderBy: [{ parentId: 'asc' }, { orden: 'asc' }],
          include: {
            recurso: { select: { id: true, nombre: true, tipo: true } },
          },
        },
      },
    })

    if (!plantilla) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    return NextResponse.json(plantilla)
  } catch (error) {
    console.error('Error obteniendo plantilla organigrama:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { nombre, descripcion, activo } = body

    const updated = await prisma.plantillaOrganigrama.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(activo !== undefined && { activo }),
      },
      include: { _count: { select: { nodos: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error actualizando plantilla organigrama:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    await prisma.plantillaOrganigrama.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error eliminando plantilla organigrama:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
